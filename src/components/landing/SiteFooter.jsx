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
          <span>© {new Date().getFullYear()} Evalis Academy</span>
        </div>
      </div>
    </footer>
  );
}