<?php
/**
 * Plugin Name: Evalis — innesti headless
 * Description: Le quattro cose che WordPress deve fare per servire un frontend Next.js:
 *              avvisare quando si pubblica, dire qual era lo slug precedente, mandare
 *              l'anteprima sul sito vero, e non farsi indicizzare.
 * Version: 1.0
 *
 * Sta in mu-plugins: si carica sempre e non e' disattivabile dalla dashboard. Se qualcuno
 * disattivasse per sbaglio queste funzioni, il blog smetterebbe di aggiornarsi senza che
 * nessuno riceva un errore — il tipo di guasto peggiore.
 */

if (!defined('ABSPATH')) {
    exit;
}

/* ---------------------------------------------------------------------------------------
 * 1. AVVISA IL SITO QUANDO SI PUBBLICA
 *
 * Senza questo, un articolo pubblicato comparirebbe online solo alla scadenza della cache
 * (un'ora) o a una ridistribuzione. Con questo, in pochi secondi.
 * ------------------------------------------------------------------------------------- */

function evalis_avvisa_il_sito($slug = '')
{
    if (!defined('EVALIS_SITO_PUBBLICO') || !defined('EVALIS_REVALIDATE_TOKEN')) {
        return;
    }

    wp_remote_post(rtrim(EVALIS_SITO_PUBBLICO, '/') . '/api/blog/revalidate', array(
        'timeout'  => 8,
        'blocking' => false, // chi pubblica non deve aspettare la risposta del sito
        'headers'  => array(
            'Content-Type'  => 'application/json',
            'x-blog-token'  => EVALIS_REVALIDATE_TOKEN,
        ),
        'body'     => wp_json_encode(array('slug' => $slug)),
    ));
}

// pubblicazione, modifica, ritorno in bozza, cestino: ognuno cambia cio' che il sito mostra
add_action('transition_post_status', function ($nuovo, $vecchio, $post) {
    if ($post->post_type !== 'post') {
        return;
    }
    if ($nuovo === 'publish' || $vecchio === 'publish') {
        evalis_avvisa_il_sito($post->post_name);
    }
}, 10, 3);

add_action('trashed_post', function ($id) {
    $post = get_post($id);
    if ($post && $post->post_type === 'post') {
        evalis_avvisa_il_sito($post->post_name);
    }
});

/* ---------------------------------------------------------------------------------------
 * 2. LO SLUG PRECEDENTE
 *
 * Il caso piu' insidioso del blog: si rinomina un articolo gia' indicizzato e il vecchio
 * indirizzo — quello che sta in Google, nei link, nei preferiti — diventa 404.
 * WordPress conserva gli slug vecchi in `_wp_old_slug` ma non li espone: questa rotta lo fa,
 * e il sito la usa per rispondere 301 invece di 404.
 *
 * Pubblica di proposito: non rivela nulla che non sia gia' online, e deve funzionare
 * proprio per i visitatori che arrivano da un link vecchio.
 * ------------------------------------------------------------------------------------- */

add_action('rest_api_init', function () {
    register_rest_route('evalis/v1', '/slug-precedente', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'args'                => array(
            'slug' => array('required' => true, 'type' => 'string'),
        ),
        'callback'            => function ($richiesta) {
            global $wpdb;
            $slug = sanitize_title($richiesta->get_param('slug'));
            if ($slug === '') {
                return null;
            }

            $id = $wpdb->get_var($wpdb->prepare(
                "SELECT post_id FROM {$wpdb->postmeta}
                 WHERE meta_key = '_wp_old_slug' AND meta_value = %s
                 ORDER BY meta_id DESC LIMIT 1",
                $slug
            ));
            if (!$id) {
                return null;
            }

            $post = get_post($id);
            if (!$post || $post->post_status !== 'publish' || $post->post_type !== 'post') {
                return null;
            }
            return array('slug' => $post->post_name);
        },
    ));
});

/* ---------------------------------------------------------------------------------------
 * 3. L'ANTEPRIMA PORTA SUL SITO VERO
 *
 * Il bottone "Anteprima" mostrerebbe la bozza col tema di WordPress, che non assomiglia al
 * nostro sito: chi scrive giudicherebbe un impaginato che nessuno vedra' mai.
 * ------------------------------------------------------------------------------------- */

function evalis_url_anteprima($post)
{
    if (!defined('EVALIS_SITO_PUBBLICO') || !defined('EVALIS_PREVIEW_TOKEN')) {
        return null;
    }
    if (!$post || $post->post_type !== 'post') {
        return null;
    }
    return add_query_arg(
        array('token' => EVALIS_PREVIEW_TOKEN, 'slug' => $post->post_name),
        rtrim(EVALIS_SITO_PUBBLICO, '/') . '/api/blog/preview'
    );
}

add_filter('preview_post_link', function ($link, $post) {
    $nostro = evalis_url_anteprima($post);
    return $nostro ? $nostro : $link;
}, 10, 2);

// anche il "Visualizza articolo" dopo la pubblicazione deve portare sul sito pubblico
add_filter('post_link', function ($url, $post) {
    if (defined('EVALIS_SITO_PUBBLICO') && $post && $post->post_type === 'post') {
        return rtrim(EVALIS_SITO_PUBBLICO, '/') . '/blog/' . $post->post_name;
    }
    return $url;
}, 10, 2);

/* ---------------------------------------------------------------------------------------
 * 4. IL CMS NON SI FA INDICIZZARE, E NON PROPONE UNA SITEMAP CONCORRENTE
 *
 * Terzo strato dopo l'header di Caddy e l'impostazione di WordPress. La sitemap di Yoast
 * elencherebbe URL del CMS in conflitto con la nostra: la disattiviamo da codice, cosi' un
 * aggiornamento del plugin non puo' rimetterla.
 * ------------------------------------------------------------------------------------- */

add_filter('wpseo_enable_xml_sitemap', '__return_false');       // Yoast
add_filter('wp_sitemaps_enabled', '__return_false');            // sitemap di WordPress
add_filter('rank_math/sitemap/enable_caching', '__return_false');

// XML-RPC non serve a un CMS headless (Caddy lo blocca gia': questo e' lo strato di dentro)
add_filter('xmlrpc_enabled', '__return_false');

// NB: l'elenco utenti NON va filtrato a mano. WordPress, a chi non ha fatto accesso, mostra
// gia' soltanto gli autori con articoli pubblicati — cioe' esattamente quello che serve alle
// pagine autore del sito. Un filtro su `rest_endpoints` qui dentro assumeva una struttura che
// WordPress non ha (dentro l'elenco delle rotte ci sono anche voci di testo, non solo array) e
// mandava in errore fatale TUTTA la REST API: niente articoli, niente compilazioni.

/* ---------------------------------------------------------------------------------------
 * 5. IL RUOLO DELL'AUTORE
 *
 * WordPress ha la biografia ma non il ruolo ("Auditor ISO 9001", "Responsabile qualita'").
 * Sulla pagina autore fa la differenza tra un nome e una competenza dichiarata.
 * Si compila nel profilo utente e il sito lo legge dalla REST.
 * ------------------------------------------------------------------------------------- */

// `register_meta` + show_in_rest NON basta per gli utenti: il campo `meta` non compare nella
// risposta pubblica, e il ruolo arrivava vuoto al sito. `register_rest_field` lo mette a
// livello principale ed e' esplicito su come si legge.
add_action('rest_api_init', function () {
    register_rest_field('user', 'evalis_ruolo', array(
        'get_callback' => function ($utente) {
            return (string) get_user_meta($utente['id'], 'evalis_ruolo', true);
        },
        'schema' => array(
            'description' => 'Ruolo mostrato sotto il nome nella pagina autore',
            'type'        => 'string',
            // 'embed' e' indispensabile: l'autore dentro ?_embed viaggia in quel contesto, e
            // senza il campo arriverebbe al sito sempre vuoto pur essendoci nel database.
            'context'     => array('embed', 'view', 'edit'),
        ),
    ));
});

add_action('show_user_profile', 'evalis_campo_ruolo');
add_action('edit_user_profile', 'evalis_campo_ruolo');
function evalis_campo_ruolo($utente)
{
    $valore = get_user_meta($utente->ID, 'evalis_ruolo', true);
    ?>
    <h2>Evalis</h2>
    <table class="form-table">
        <tr>
            <th><label for="evalis_ruolo">Ruolo mostrato sul sito</label></th>
            <td>
                <input type="text" id="evalis_ruolo" name="evalis_ruolo" class="regular-text"
                       value="<?php echo esc_attr($valore); ?>" />
                <p class="description">Es. «Auditor ISO 9001». Compare sotto il nome nella pagina autore.</p>
            </td>
        </tr>
    </table>
    <?php
}

add_action('personal_options_update', 'evalis_salva_ruolo');
add_action('edit_user_profile_update', 'evalis_salva_ruolo');
function evalis_salva_ruolo($id)
{
    if (!current_user_can('edit_user', $id)) {
        return;
    }
    if (isset($_POST['evalis_ruolo'])) {
        update_user_meta($id, 'evalis_ruolo', sanitize_text_field(wp_unslash($_POST['evalis_ruolo'])));
    }
}
