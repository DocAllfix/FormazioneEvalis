"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import SchedaArticolo from "@/components/blog/SchedaArticolo";

/**
 * Pagina autore. Come Blog.jsx e BlogPost.jsx riceve tutto per props: la pagina server fa la
 * lettura, questo componente mostra e basta.
 *
 * Sta qui e non dentro la rotta perche' ScrollReveal usa `useReducedMotion`, che vive solo nel
 * browser: da un componente server la compilazione fallisce.
 */
export default function AutoreBlog({ autore, articoli }) {
  const elenco = articoli ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full pt-28 md:pt-32 pb-10 md:pb-14 bg-background relative overflow-hidden">
          <div className="absolute inset-0 dot-grid pointer-events-none" aria-hidden="true" />
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
            <ScrollReveal>
              <nav className="flex items-center gap-1.5 text-xs text-[#766E66] mb-6">
                <Link href="/" className="hover:text-near-black transition-colors duration-150">
                  Home
                </Link>
                <ChevronRight className="h-3 w-3" />
                <Link href="/blog" className="hover:text-near-black transition-colors duration-150">
                  Blog
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-near-black truncate">{autore.nome}</span>
              </nav>

              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {autore.avatar ? (
                  <img
                    src={autore.avatar}
                    alt={autore.nome}
                    width={96}
                    height={96}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-[#EAE4DB] flex-shrink-0"
                  />
                ) : null}
                <div className="min-w-0">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
                    Autore
                  </span>
                  <h1 className="mt-2 font-heading text-3xl md:text-4xl lg:text-[44px] text-near-black leading-[1.12]">
                    {autore.nome}
                  </h1>
                  {autore.ruolo ? (
                    <p className="mt-2 text-sm text-[#766E66]">{autore.ruolo}</p>
                  ) : null}
                </div>
              </div>

              {autore.bio ? (
                <p className="mt-6 text-base text-[#5C5347] leading-relaxed max-w-2xl">
                  {autore.bio}
                </p>
              ) : null}
            </ScrollReveal>
          </div>
        </section>

        <section className="w-full pb-20 md:pb-24 bg-background">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <h2 className="font-heading text-2xl md:text-3xl text-near-black mb-8">
                {elenco.length === 1 ? "1 articolo" : `${elenco.length} articoli`}
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elenco.map((a, i) => (
                <SchedaArticolo key={a.slug} article={a} index={i} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
