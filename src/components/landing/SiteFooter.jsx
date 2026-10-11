import React from "react";
import Link from "next/link";
import EcoVadisBadge from "./EcoVadisBadge";
import { PreferenzeCookie } from "@/components/legal/preferenze-cookie";

const footerColumns = [
  {
    title: "Prodotto",
    links: [
      { label: "Corsi", href: "/#catalogo" },
      { label: "Per le aziende", href: "/aziende" },
      { label: "Verifica certificato", href: "/#verifica" },
    ],
  },
  {
    title: "Legale",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Termini e condizioni", href: "/termini" },
      { label: "Cookie policy", href: "/cookie" },
    ],
  },
  {
    title: "Contatti",
    links: [
      { label: "evaliscert@libero.it", href: "mailto:evaliscert@libero.it" },
      { label: "081 3992324", href: "tel:+390813992324" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="w-full bg-near-black border-t border-[#3D2E1E]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="font-heading text-base text-white hover:opacity-80 transition-opacity"
            >
              Formazione <span className="text-primary">Evalis</span>
            </Link>
            <p className="mt-3 text-sm text-[#9C9388] leading-relaxed">
              Corsi professionali verificabili. Preparazione, esami e
              certificati con QR e codice univoco.
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="font-body font-medium text-sm text-white mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#9C9388] hover:text-white transition-colors duration-150"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                {/* il consenso dev'essere revocabile con la stessa facilita' con cui e' stato
                    dato: senza questo link, la scelta resterebbe congelata per sempre */}
                {col.title === "Legale" ? (
                  <li>
                    <PreferenzeCookie className="text-sm text-[#9C9388] hover:text-white transition-colors duration-150" />
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>

        {/* credenziale, non argomentazione: sta accanto ai dati legali, in sordina */}
        <div className="mt-10 pt-8 border-t border-[#3D2E1E]">
          <EcoVadisBadge size="sm" variant="scuro" />
        </div>

        <div className="mt-8 pt-6 border-t border-[#3D2E1E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#9C9388]">
          <span>
            Evalis S.R.L. · Via Sandro Botticelli 25, 81031 Aversa (CE) · P.IVA/C.F. 04868330616 · REA CE-361943
          </span>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-5">
            <span>© {new Date().getFullYear()} Evalis Academy</span>
            {/* credito allo sviluppatore: link volutamente dofollow (niente nofollow/sponsored/ugc) */}
            <a
              href="https://www.axialoop.com/it"
              target="_blank"
              rel="noopener"
              aria-label="powered by Axialoop: sito di Axialoop, che ha sviluppato Evalis Academy (si apre in una nuova scheda)"
              className="inline-flex min-h-6 items-center gap-2 text-sm text-[#9C9388] transition-colors duration-150 hover:text-white"
            >
              {/* footer scuro: il contorno quasi nero del logo prende il colore del testo; blu e verde restano */}
              <svg viewBox="0 0 497 494" width="19" height="19" focusable="false" aria-hidden="true" className="shrink-0">
                  <path fill="currentColor" fillRule="evenodd" d="M247 4 L139 67 L137 161 L5 238 L4 348 L210 470 L251 490 L492 350 L493 238 L358 158 L358 67 Z M245 231 L248 243 L347 301 L250 358 L197 328 L197 260 Z" />
                  <path fill="#5683a9" d="M428 317 L377 290 L256 362 L307 389 L428 320 Z M142 293 L190 323 L193 322 L192 265 Z M10 245 L10 347 L201 459 L246 482 L246 428 L62 321 L60 274 Z M361 231 L355 240 L308 269 L308 272 L349 296 L376 283 L376 241 Z M360 167 L360 224 L434 267 L484 240 Z M246 75 L199 101 L199 188 L246 161 Z M148 67 L193 95 L204 92 L248 66 L301 96 L350 69 L250 9 Z" />
                  <path fill="#7cbb84" d="M70 317 L248 422 L297 395 L290 388 L120 289 Z M382 246 L383 284 L432 311 L432 273 Z M188 193 L138 166 L17 236 L15 240 L66 267 L183 199 Z M252 76 L253 240 L300 265 L300 103 Z M144 75 L144 159 L193 187 L193 103 Z" />
              </svg>
              <span>
                powered by <span className="font-semibold">Axialoop</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}