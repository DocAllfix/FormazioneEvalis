// Astrazione della sorgente video del player (Modulo 4).
//
// Il player NON conosce il provider: chiede sempre l'URL del manifest a questa
// funzione. Così cambiare sorgente (test -> Cloudflare Stream signed URL -> altro)
// non tocca una riga del player.
//
// - Prototipo: ritorna uno stream HLS di test pubblico (gratuito).
// - Produzione: firmerà un token RS256 per il videoUid e restituirà il manifest
//   firmato di Cloudflare Stream (impedisce la condivisione del link).

// Stream HLS pubblico di test (per costruire e validare la logica antifrode).
const TEST_HLS_MANIFEST = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export async function getLessonStreamUrl(
  videoUid: string | null,
): Promise<string> {
  if (!videoUid) {
    return TEST_HLS_MANIFEST;
  }

  // TODO produzione: generare un token firmato (RS256) con scadenza per `videoUid`
  // usando CLOUDFLARE_STREAM_SIGNING_KEY e restituire
  // https://customer-<code>.cloudflarestream.com/<token>/manifest/video.m3u8
  return TEST_HLS_MANIFEST;
}

// La clip avatar di una slide è un video: stessa sorgente firmata della lezione.
export async function getClipStreamUrl(clipUid: string | null): Promise<string> {
  return getLessonStreamUrl(clipUid);
}
