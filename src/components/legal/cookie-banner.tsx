"use client";

// Banner cookie INFORMATIVO (la piattaforma usa solo cookie tecnici → nessun consenso richiesto,
// basta l'informativa al primo accesso). Se in futuro si aggiungono cookie analitici/marketing,
// va sostituito con un banner di consenso granulare. Stato memorizzato in localStorage.
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "evalis-cookie-notice-v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage non disponibile: non mostrare */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignora */
    }
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[#EAE4DB] bg-white p-4 shadow-[0_12px_40px_rgba(26,18,9,0.16)] sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <p className="flex-1 text-sm leading-relaxed text-[#5C5347]">
          Questo sito utilizza solo <strong className="text-near-black">cookie tecnici</strong> necessari al
          funzionamento e alla sicurezza. Nessuna profilazione.{" "}
          <Link href="/cookie" className="font-medium text-primary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
}
