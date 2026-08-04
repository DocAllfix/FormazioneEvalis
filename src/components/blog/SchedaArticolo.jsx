"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { dataItaliana } from "@/features/blog/data";

/** La scheda di un articolo. Usata dall'elenco del blog e dalle pagine autore. */
export default function SchedaArticolo({ article, index = 0 }) {
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
              <time dateTime={article.date}>{dataItaliana(article.date)}</time>
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
