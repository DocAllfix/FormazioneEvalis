// Notifiche dei ticket: chi viene avvisato, con quale testo, e che un invio fallito non
// rompe niente. Nessuna email vera: l'invio è sostituito da una funzione che registra.

import { describe, it, expect } from "vitest";
import {
  destinatariAssistenza,
  anteprima,
  avvisaNuovoTicket,
  avvisaRispostaUtente,
  avvisaRispostaStaff,
  type Dipendenze,
} from "../features/support/notifiche";

function finto(staff = ["admin@evalis.it"]) {
  const inviate: { to: string[]; subject: string; html: string }[] = [];
  const d: Dipendenze = {
    invia: async (m) => { inviate.push(m); },
    rendi: (o) => [o.heading, ...o.body, o.button?.url ?? ""].join("\n"),
    baseUrl: "https://evalisacademy.it",
    staff,
  };
  return { d, inviate };
}

const ticket = { ticketId: "t1", oggetto: "Non vedo il corso", messaggio: "Ho pagato ma non compare.", autoreNome: "Mario", autoreEmail: "mario@x.it" };

describe("destinatariAssistenza", () => {
  it("elenco separato da virgola, ripulito, senza doppioni, senza voci non email", () => {
    expect(destinatariAssistenza(" A@x.it, b@y.it ,, a@x.it, niente ")).toEqual(["a@x.it", "b@y.it"]);
  });
  it("variabile assente -> nessun destinatario (in locale e nei collaudi non parte niente)", () => {
    expect(destinatariAssistenza(undefined)).toEqual([]);
    expect(destinatariAssistenza("")).toEqual([]);
  });
});

describe("i tre eventi", () => {
  it("1 · nuovo ticket -> email allo staff, con link alla coda staff", async () => {
    const { d, inviate } = finto();
    expect(await avvisaNuovoTicket(d, ticket)).toBe(true);
    expect(inviate).toHaveLength(1);
    expect(inviate[0].to).toEqual(["admin@evalis.it"]);
    expect(inviate[0].subject).toContain("Non vedo il corso");
    expect(inviate[0].html).toContain("https://evalisacademy.it/staff/ticket/t1");
  });

  it("2 · l'utente risponde -> email allo staff", async () => {
    const { d, inviate } = finto();
    expect(await avvisaRispostaUtente(d, ticket)).toBe(true);
    expect(inviate[0].to).toEqual(["admin@evalis.it"]);
  });

  it("3 · lo staff risponde -> email al proprietario, con link al SUO ticket", async () => {
    const { d, inviate } = finto();
    const ok = await avvisaRispostaStaff(d, {
      ticketId: "t1", oggetto: "Non vedo il corso", messaggio: "Risolto.",
      autoreId: "staff1", proprietarioId: "u1", proprietarioNome: "Mario", proprietarioEmail: "mario@x.it",
    });
    expect(ok).toBe(true);
    expect(inviate[0].to).toEqual(["mario@x.it"]);
    expect(inviate[0].html).toContain("https://evalisacademy.it/assistenza/t1");
    expect(inviate[0].html).not.toContain("/staff/"); // l'utente non riceve link alla coda staff
  });
});

describe("chi scrive non riceve la propria email", () => {
  it("staff che risponde a un ticket SUO -> nessuna email", async () => {
    const { d, inviate } = finto();
    const ok = await avvisaRispostaStaff(d, {
      ticketId: "t1", oggetto: "x", messaggio: "y",
      autoreId: "u1", proprietarioId: "u1", proprietarioNome: "A", proprietarioEmail: "admin@evalis.it",
    });
    expect(ok).toBe(false);
    expect(inviate).toHaveLength(0);
  });

  it("amministratore che apre un ticket -> non lo avvisa se stesso", async () => {
    const { d, inviate } = finto(["admin@evalis.it", "altro@evalis.it"]);
    await avvisaNuovoTicket(d, { ...ticket, autoreEmail: "ADMIN@evalis.it" });
    expect(inviate[0].to).toEqual(["altro@evalis.it"]);
  });
});

describe("best effort: un'email che fallisce non rompe niente", () => {
  it("l'invio lancia un errore -> la funzione NON rilancia e restituisce false", async () => {
    const { d } = finto();
    d.invia = async () => { throw new Error("Resend giù"); };
    await expect(avvisaNuovoTicket(d, ticket)).resolves.toBe(false);
  });

  it("nessun destinatario staff configurato -> nessun invio tentato", async () => {
    const { d, inviate } = finto([]);
    expect(await avvisaNuovoTicket(d, ticket)).toBe(false);
    expect(inviate).toHaveLength(0);
  });
});

describe("sicurezza del contenuto", () => {
  it("oggetto e messaggio con HTML vengono resi innocui", async () => {
    const { d, inviate } = finto();
    await avvisaNuovoTicket(d, { ...ticket, oggetto: "<img src=x onerror=alert(1)>", messaggio: "<script>x</script>" });
    expect(inviate[0].html).not.toContain("<script>");
    expect(inviate[0].html).not.toContain("<img");
    expect(inviate[0].html).toContain("&lt;script&gt;");
  });

  it("messaggio lunghissimo -> anteprima troncata", () => {
    const t = anteprima("a".repeat(2000));
    expect(t.length).toBeLessThanOrEqual(601);
    expect(t.endsWith("…")).toBe(true);
  });
});
