import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const navLinks = [
  { label: "Per le aziende", to: "/aziende" },
  { label: "Verifica certificato", href: "/#verifica" },
];

const certAreas = [
  {
    title: "Auditor ISO",
    desc: "9001, 14001, 45001, 27001, 22000, 50001",
    href: "/#catalogo",
  },
  {
    title: "Mestieri e professioni",
    desc: "Elettricista, idraulico, muratore e altri",
    href: "/#catalogo",
  },
  { title: "Settore bancario", desc: "Impiegato bancario", href: "/#catalogo" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-[12px] transition-shadow duration-200"
      style={{ borderBottom: "0.5px solid #EAE4DB", boxShadow: scrolled ? "0 4px 24px rgba(26,18,9,0.06)" : "none" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-heading text-lg text-near-black hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          Formazione <span className="text-primary">Evalis</span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-7"
          aria-label="Navigazione principale"
        >
          <div className="relative group">
            <button
              className="flex items-center gap-1 text-sm text-[#5C5347] hover:text-near-black transition-colors"
              aria-haspopup="true"
            >
              Corsi
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div className="absolute top-full left-0 pt-3 w-72">
              <div className="bg-white rounded-xl border border-[#EAE4DB] shadow-[0_12px_32px_rgba(26,18,9,0.12)] p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                {certAreas.map((area) => (
                  <a
                    key={area.title}
                    href={area.href}
                    className="block px-3 py-2.5 rounded-lg hover:bg-[#FAFAF7] transition-colors"
                  >
                    <p className="font-body font-medium text-sm text-near-black">
                      {area.title}
                    </p>
                    <p className="text-xs text-[#766E66] mt-0.5">{area.desc}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {navLinks.map((link) =>
            link.to ? (
              <Link
                key={link.to}
                href={link.to}
                className={`text-sm transition-colors duration-150 ${
                  pathname === link.to
                    ? "text-near-black relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-full"
                    : "text-[#5C5347] hover:text-near-black"
                }`}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[#5C5347] hover:text-near-black transition-colors duration-150"
              >
                {link.label}
              </a>
            )
          )}
          <Link
            href="/blog"
            className="text-sm text-[#5C5347] hover:text-near-black transition-colors duration-150"
          >
            Blog
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-[#5C5347] hover:text-near-black transition-colors"
          >
            Accedi
          </Link>
          <Link
            href="/registrati"
            className="text-sm font-medium text-white bg-primary rounded-lg px-4 py-2 hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
          >
            Registrati
          </Link>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 text-near-black"
              aria-label="Apri menu di navigazione"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-white p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 h-16 border-b border-[#EAE4DB]">
                <span className="font-heading text-base text-near-black">
                  Formazione <span className="text-primary">Evalis</span>
                </span>
                <SheetClose asChild>
                  <button className="p-2 text-[#5C5347]" aria-label="Chiudi menu">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </SheetClose>
              </div>
              <nav className="flex flex-col px-4 pt-4" aria-label="Navigazione mobile">
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium px-3 mb-1 mt-2">
                  Corsi
                </p>
                {certAreas.map((area) => (
                  <a
                    key={area.title}
                    href={area.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-near-black py-2.5 px-3 rounded-lg hover:bg-[#FAFAF7] transition-colors"
                  >
                    {area.title}
                  </a>
                ))}
                <div className="border-t border-[#EAE4DB] my-2" />
                {navLinks.map((link) =>
                  link.to ? (
                    <Link
                      key={link.to}
                      href={link.to}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-near-black py-2.5 px-3 rounded-lg hover:bg-[#FAFAF7] transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-near-black py-2.5 px-3 rounded-lg hover:bg-[#FAFAF7] transition-colors"
                    >
                      {link.label}
                    </a>
                  )
                )}
                <Link
                  href="/blog"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-near-black py-2.5 px-3 rounded-lg hover:bg-[#FAFAF7] transition-colors"
                >
                  Blog
                </Link>
              </nav>
              <div className="mt-auto px-4 pb-6 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-sm text-center font-medium text-near-black border border-[#EAE4DB] rounded-lg py-2.5 hover:bg-[#FAFAF7] transition-colors"
                >
                  Accedi
                </Link>
                <Link
                  href="/registrati"
                  onClick={() => setOpen(false)}
                  className="text-sm text-center font-medium text-white bg-primary rounded-lg py-2.5 hover:brightness-110 transition-all"
                >
                  Registrati
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}