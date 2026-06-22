"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowRight, ArrowLeft, ChevronRight, Clock } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { getArticleBySlug, allArticles } from "@/lib/blogArticles";

const mdComponents = {
  h2: ({ node, ...props }) => (
    <h2
      className="font-heading text-2xl md:text-3xl text-near-black mt-10 mb-4"
      {...props}
    />
  ),
  h3: ({ node, ...props }) => (
    <h3
      className="font-heading text-xl md:text-2xl text-near-black mt-8 mb-3"
      {...props}
    />
  ),
  p: ({ node, ...props }) => (
    <p
      className="text-base md:text-lg text-[#5C5347] leading-relaxed mb-5"
      {...props}
    />
  ),
  img: ({ node, ...props }) => (
    <img
      className="w-full rounded-xl my-8 border border-[#EAE4DB]"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul
      className="list-disc list-inside space-y-2 text-base text-[#5C5347] leading-relaxed mb-5"
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="list-decimal list-inside space-y-2 text-base text-[#5C5347] leading-relaxed mb-5"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-primary pl-5 italic text-[#5C5347] my-6 text-base md:text-lg"
      {...props}
    />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-medium text-near-black" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a className="text-primary underline hover:no-underline" {...props} />
  ),
};

export default function BlogPost() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

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

  const related = allArticles.filter((a) => a.slug !== slug).slice(0, 3);

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
                <span className="text-near-black font-medium">
                  {article.author}
                </span>
                <span>·</span>
                <span>{article.date}</span>
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
              <ReactMarkdown components={mdComponents}>
                {article.content}
              </ReactMarkdown>
            </ScrollReveal>

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

        {/* Related */}
        <section className="w-full pb-20 md:pb-24 bg-cream-dark">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <h2 className="font-heading text-2xl md:text-3xl text-near-black mb-8">
                Articoli correlati
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((rel, i) => (
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
                        <span className="text-xs text-[#766E66]">
                          {rel.date}
                        </span>
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
      </main>
      <SiteFooter />
    </div>
  );
}