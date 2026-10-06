import { describe, expect, it } from "vitest";
import { ErroreUtente, conEsito, esegui } from "../lib/esito";

describe("conEsito / esegui", () => {
  it("successo: il valore passa intatto", async () => {
    expect(await conEsito(async () => "https://checkout")).toEqual({ ok: true, dato: "https://checkout" });
    expect(await esegui(conEsito(async () => 42))).toBe(42);
  });

  it("errore per l'utente: diventa un valore e il componente lo rivede come eccezione col suo messaggio", async () => {
    const r = await conEsito(async () => { throw new ErroreUtente("Hai già questo corso: lo trovi tra i tuoi percorsi."); });
    expect(r).toEqual({ ok: false, errore: "Hai già questo corso: lo trovi tra i tuoi percorsi." });
    await expect(esegui(Promise.resolve(r))).rejects.toThrow("Hai già questo corso: lo trovi tra i tuoi percorsi.");
  });

  it("guasto vero: resta un'eccezione, non viene trasformato", async () => {
    await expect(conEsito(async () => { throw new Error("connessione al database persa"); })).rejects.toThrow("connessione al database persa");
  });
});
