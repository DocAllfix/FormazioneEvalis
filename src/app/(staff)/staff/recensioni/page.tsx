import { sessioneStaffPagina } from "@/features/auth/pagina";
import { PageHeader } from "@/components/admin/page-header";
import { RecensioniList, type StaffRecensione } from "@/components/admin/recensioni-list";
import { FILTRI_RECENSIONI, listRecensioniStaff, type FiltroRecensioni } from "@/features/recensioni/recensioni";

export const metadata = { title: "Recensioni — Evalis Staff" };

const giorno = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome" }) : "";

// Le opinioni dei corsisti. Va sul sito solo ciò che ha il consenso dell'utente e che approvi
// qui; «In landing» lo mostra in «Dicono di noi». La mail di ogni opinione da approvare porta qui.
export default async function StaffRecensioniPage({ searchParams }: { searchParams: Promise<{ q?: string; stato?: string }> }) {
  await sessioneStaffPagina();
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const filtro = FILTRI_RECENSIONI.includes(sp.stato as FiltroRecensioni) ? (sp.stato as FiltroRecensioni) : "da_approvare";

  const righe = await listRecensioniStaff({ q, stato: filtro });
  const items: StaffRecensione[] = righe.map((r) => ({
    id: r.id,
    votoCorso: r.votoCorso,
    votoPiattaforma: r.votoPiattaforma,
    testo: r.testo,
    pubblicazione: r.pubblicazione,
    nomePubblico: r.nomePubblico,
    consensoLabel: r.consensoIl ? `consenso del ${giorno(r.consensoIl)}` : "",
    stato: r.stato,
    inEvidenza: r.inEvidenza,
    dataLabel: giorno(r.updatedAt),
    autore: r.autore,
    email: r.email,
    corso: r.corso,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recensioni"
        description="Le opinioni di chi ha completato un corso. Sul sito va solo ciò che ha il consenso dell'utente e che approvi qui; «In landing» la mostra in «Dicono di noi». Nascondi solo insulti, dati personali o prove: le opinioni negative si approvano come le altre, e la media sul sito conta tutti i voti."
      />
      <RecensioniList items={items} q={q} filtro={filtro} />
    </div>
  );
}
