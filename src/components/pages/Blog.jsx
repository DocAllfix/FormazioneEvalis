"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Clock } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { featured, articles } from "@/lib/blogArticles";

function ArticleCard({ article, index }) {
  return (
    <ScrollReveal delay={Math.min(index * 0.05, 0.25)}>
      <Link
        href={`/blog/${article.slug}`}
        className="group flex flex-col bg-white border border-[#EAE4DB] rounded-2xl overflow-hidden hover:-translate-y-[3px] hover:border-primary transition-all duration-200 hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)] h-full"
      >
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
        <div className="p-6 flex flex-col flex-1">
          <span className="inline-block self-start text-[11px] font-medium px-3 py-1 rounded-full bg-[#FEF0EB] text-[#C03E08] mb-3">
            {article.category}
          </span>
          <h3 className="font-heading text-lg text-near-black group-hover:text-primary transition-colors duration-200">
            {article.title}
          </h3>
          <p className="mt-2 text-sm text-[#5C5347] leading-relaxed flex-1">
            {article.excerpt}
          </p>
          <div className="mt-5 pt-4 border-t border-[#EAE4DB] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#766E66]">
              <span>{article.date}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.readTime}
              </span>
            </div>
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EFE6] text-[#766E66] group-hover:bg-primary group-hover:text-white transition-all duration-200 flex-shrink-0">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </ScrollReveal>
  );
}

export default function Blog() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="w-full pt-28 md:pt-32 pb-12 md:pb-16 bg-background relative overflow-hidden">
          <div
            className="absolute inset-0 dot-grid pointer-events-none"
            aria-hidden="true"
          />
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
            <ScrollReveal>
              <nav className="flex items-center gap-1.5 text-xs text-[#766E66] mb-6">
                <Link
                  href="/"
                  className="hover:text-near-black transition-colors duration-150"
                >
                  Home
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-near-black">Blog</span>
              </nav>
              <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
                Risorse e approfondimenti
              </span>
              <h1 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
                Il blog di Formazione Evalis
              </h1>
              <p className="mt-5 text-base text-[#5C5347] leading-relaxed max-w-xl">
                Guide, approfondimenti e consigli su corsi professionali e
                opportunità di carriera.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Featured */}
        <section className="w-full py-8 md:py-12 bg-background">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <Link
                href={`/blog/${featured.slug}`}
                className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white border border-[#EAE4DB] rounded-2xl overflow-hidden hover:border-primary transition-all duration-200 hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)] group"
              >
                <div className="aspect-[16/10] lg:aspect-auto lg:min-h-[360px] overflow-hidden">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="p-8 md:p-10 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-block text-[11px] font-medium px-3 py-1 rounded-full bg-[#FEF0EB] text-[#C03E08]">
                      {featured.category}
                    </span>
                    <span className="text-xs text-[#766E66]">
                      In evidenza
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl md:text-3xl text-near-black group-hover:text-primary transition-colors duration-200">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-sm md:text-base text-[#5C5347] leading-relaxed flex-1">
                    {featured.excerpt}
                  </p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#766E66]">
                      <span>{featured.author}</span>
                      <span>·</span>
                      <span>{featured.date}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {featured.readTime}
                      </span>
                    </div>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5EFE6] text-[#766E66] group-hover:bg-primary group-hover:text-white transition-all duration-200 flex-shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* Grid */}
        <section className="w-full pb-20 md:pb-24 bg-background">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <h2 className="font-heading text-2xl md:text-3xl text-near-black mb-8">
                Ultimi articoli
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, i) => (
                <ArticleCard key={article.slug} article={article} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="w-full py-16 md:py-20 bg-cream-dark">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="font-heading text-3xl md:text-4xl text-near-black">
                  Resta aggiornato
                </h2>
                <p className="mt-4 text-base text-[#5C5347] leading-relaxed">
                  Ricevi guide e approfondimenti sui corsi professionali
                  direttamente nella tua email.
                </p>
                <form className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    aria-label="Il tuo indirizzo email"
                    placeholder="La tua email"
                    className="flex-1 h-12 bg-white border border-[#EAE4DB] rounded-lg px-4 text-base text-near-black placeholder:text-[#766E66] focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium rounded-lg px-6 h-12 hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
                  >
                    Iscrivimi
                  </button>
                </form>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}