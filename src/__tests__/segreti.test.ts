// Test del confronto di segreti a tempo costante.
//
// Un confronto "sicuro" che non funziona e' peggio di uno normale: sembra a posto, nessuno lo
// riguarda piu', e intanto non protegge. Qui si verifica il comportamento — che accetti il
// segreto giusto, rifiuti tutto il resto, e soprattutto **fallisca chiuso** quando manca.

import { describe, it, expect } from "vitest";
import { segretoValido, bearerValido } from "../lib/segreti";

const SEGRETO = "3d03d697f0f3bd4e64c9672595c6ee9b89d0d067adfbac7bcc5be4a1b95009b8";

describe("segretoValido", () => {
  it("accetta il segreto identico", () => {
    expect(segretoValido(SEGRETO, SEGRETO)).toBe(true);
  });

  it("rifiuta un segreto diverso della stessa lunghezza", () => {
    expect(segretoValido(SEGRETO, SEGRETO.slice(0, -1) + "0")).toBe(false);
  });

  it("rifiuta un segreto che azzecca il prefisso", () => {
    // e' il caso che il confronto a tempo costante esiste per rendere inutile
    expect(segretoValido(SEGRETO, SEGRETO.slice(0, 60))).toBe(false);
    expect(segretoValido(SEGRETO, SEGRETO + "in-piu")).toBe(false);
  });

  it("non esplode con lunghezze diverse", () => {
    // `timingSafeEqual` lancia su buffer di lunghezza diversa: passiamo dagli hash proprio per
    // questo, e cosi' nemmeno la lunghezza del segreto trapela
    expect(() => segretoValido(SEGRETO, "x")).not.toThrow();
    expect(segretoValido(SEGRETO, "x")).toBe(false);
  });

  it("FALLISCE CHIUSO quando il segreto atteso non e' configurato", () => {
    // il caso pericoloso: variabile d'ambiente dimenticata. Nessun valore deve passare.
    expect(segretoValido(undefined, "qualsiasi")).toBe(false);
    expect(segretoValido("", "")).toBe(false);
    expect(segretoValido(null, null)).toBe(false);
    expect(segretoValido(undefined, undefined)).toBe(false);
  });

  it("rifiuta il ricevuto vuoto anche con l'atteso configurato", () => {
    expect(segretoValido(SEGRETO, "")).toBe(false);
    expect(segretoValido(SEGRETO, null)).toBe(false);
  });
});

describe("bearerValido", () => {
  it("accetta l'intestazione ben formata", () => {
    expect(bearerValido(SEGRETO, `Bearer ${SEGRETO}`)).toBe(true);
  });

  it("rifiuta senza il prefisso Bearer", () => {
    expect(bearerValido(SEGRETO, SEGRETO)).toBe(false);
    expect(bearerValido(SEGRETO, `bearer ${SEGRETO}`)).toBe(false);
  });

  it("rifiuta un token sbagliato dentro un'intestazione giusta", () => {
    expect(bearerValido(SEGRETO, "Bearer sbagliato")).toBe(false);
  });

  it("fallisce chiuso senza segreto atteso", () => {
    expect(bearerValido(undefined, `Bearer ${SEGRETO}`)).toBe(false);
  });
});
