"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ChevronRight, Clock } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { dataItaliana } from "@/features/blog/data";

/**
 * L'articolo e i correlati arrivano dalla pagina server: il componente non conosce la fonte.
 * `article.content` e' HTML GIA' SANIFICATO da `src/features/blog/sanitize.ts` — mai HTML
 * grezzo del CMS.
 */
export default function BlogPost({ article, related }) {
  const correlati = related ?? [];

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1 pt-28 md:pt-32">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 text-center py-20">
            <p className="text-[#766E66]">Articolo non trovato.</p>
            <Link
              href="/blog"
              className="mt-4 inline-block text-primary hover:underline"
            >
              Torna al blog
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="w-full pt-28 md:pt-32 pb-10 md:pb-12 bg-background relative overflow-hidden">
          <div
            className="absolute inset-0 dot-grid pointer-events-none"
            aria-hidden="true"
          />
          <div className="max-w-3xl mx-auto px-6 md:px-10 relative">
            <ScrollReveal>
              <nav className="flex items-center gap-1.5 text-xs text-[#766E66] mb-6">
                <Link
                  href="/"
                  className="hover:text-near-black transition-colors duration-150"
                >
                  Home
                </Link>
                <ChevronRight className="h-3 w-3" />
                <Link
                  href="/blog"
                  className="hover:text-near-black transition-colors duration-150"
                >
                  Blog
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-near-black truncate">
                  {article.category}
                </span>
              </nav>
              <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-full bg-[#FEF0EB] text-[#C03E08] mb-4">
                {article.category}
              </span>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-[44px] text-near-black leading-[1.15]">
                {article.title}
              </h1>
              <div className="mt-5 flex items-center gap-2 text-sm text-[#766E66]">
                {article.autore?.slug ? (
                  <Link
                    href={`/blog/autore/${article.autore.slug}`}
                    className="text-near-black font-medium hover:text-primary transition-colors duration-150"
                  >
                    {article.author}
                  </Link>
                ) : (
                  <span className="text-near-black font-medium">
                    {article.author}
                  </span>
                )}
                <span>·</span>
                <time dateTime={article.date}>{dataItaliana(article.date)}</time>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readTime}
                </span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Hero image */}
        <section className="w-full bg-background">
          <div className="max-w-4xl mx-auto px-6 md:px-10">
            <ScrollReveal delay={0.1}>
              <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-[#EAE4DB]">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Content */}
        <section className="w-full py-12 md:py-16 bg-background">
          <div className="max-w-3xl mx-auto px-6 md:px-10">
            <ScrollReveal delay={0.15}>
              {/* gia' sanificato lato server: la lista bianca di sanitize.ts ha tolto script,
                  gestori di eventi e schemi pericolosi prima che l'HTML arrivasse qui */}
              <div className="articolo-blog" dangerouslySetInnerHTML={{ __html: article.content }} />
            </ScrollReveal>

            {/* Chi ha scritto. Non e' decorazione: e' il segnale che dice a chi legge — e a
                Google — che dietro l'articolo c'e' una persona con una competenza verificabile. */}
            {article.autore?.slug ? (
              <div className="mt-12 pt-8 border-t border-[#EAE4DB] flex items-start gap-4">
                {article.autore.avatar ? (
                  <img
                    src={article.autore.avatar}
                    alt={article.autore.nome}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover border border-[#EAE4DB] flex-shrink-0"
                  />
                ) : null}
                <div className="min-w-0">
                  <Link
                    href={`/blog/autore/${article.autore.slug}`}
                    className="font-heading text-lg text-near-black hover:text-primary transition-colors duration-150"
                  >
                    {article.autore.nome}
                  </Link>
                  {article.autore.ruolo ? (
                    <p className="text-xs text-[#766E66] mt-0.5">{article.autore.ruolo}</p>
                  ) : null}
                  {article.autore.bio ? (
                    <p className="mt-2 text-sm text-[#5C5347] leading-relaxed">
                      {article.autore.bio}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-12 pt-8 border-t border-[#EAE4DB]">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-near-black hover:text-primary transition-colors duration-150"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al blog
              </Link>
            </div>
          </div>
        </section>

        {/* Related — senza correlati resterebbe una fascia vuota sotto l'articolo */}
        {correlati.length > 0 ? (
        <section className="w-full pb-20 md:pb-24 bg-cream-dark">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <h2 className="font-heading text-2xl md:text-3xl text-near-black mb-8">
                Articoli correlati
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {correlati.map((rel, i) => (
                <ScrollReveal key={rel.slug} delay={i * 0.08}>
                  <Link
                    href={`/blog/${rel.slug}`}
                    className="group flex flex-col bg-white border border-[#EAE4DB] rounded-2xl overflow-hidden hover:-translate-y-[3px] hover:border-primary transition-all duration-200 hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)] h-full"
                  >
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={rel.image}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <span className="inline-block self-start text-[11px] font-medium px-3 py-1 rounded-full bg-[#FEF0EB] text-[#C03E08] mb-3">
                        {rel.category}
                      </span>
                      <h3 className="font-heading text-lg text-near-black group-hover:text-primary transition-colors duration-200">
                        {rel.title}
                      </h3>
                      <div className="mt-auto pt-5 flex items-center justify-between">
                        <time className="text-xs text-[#766E66]" dateTime={rel.date}>
                          {dataItaliana(rel.date)}
                        </time>
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EFE6] text-[#766E66] group-hover:bg-primary group-hover:text-white transition-all duration-200 flex-shrink-0">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}