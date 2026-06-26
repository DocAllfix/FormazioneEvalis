import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DashboardMockup from "./DashboardMockup";

export default function BentoHero() {
  return (
    <section
      className="w-full relative overflow-hidden bg-background"
      style={{ minHeight: "85vh" }}>
      
      <div
        className="absolute inset-0 dot-grid pointer-events-none"
        aria-hidden="true" />
      

      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-16 md:pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            


            

            <h1 className="mt-6 font-heading text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] leading-[1.05] tracking-tight text-near-black">
              Certifica le tue competenze.
            </h1>

            <p className="mt-5 text-lg text-[#5C5347] leading-relaxed max-w-md">
              Preparazione online, esame e certificato verificabile con QR.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 bg-primary text-white font-medium rounded-lg px-6 py-3 text-base hover:brightness-110 hover:scale-[1.02] transition-all duration-200">
                
                Esplora i corsi
              </Link>
              <a
                href="#aziende"
                className="inline-flex items-center gap-1.5 text-near-black font-medium text-base px-5 py-3 rounded-lg border border-near-black/10 hover:border-near-black/20 hover:bg-near-black/[0.03] transition-all duration-200">
                
                Soluzioni per aziende
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              className="relative rounded-2xl overflow-hidden border border-[#EAE4DB]"
              style={{
                transform: "perspective(1200px) rotateY(-5deg) rotateX(2deg)",
                boxShadow: "0 24px 64px rgba(26,18,9,0.15)"
              }}>
              
              <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[#EAE4DB]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EAE4DB]" />
                  <div className="w-3 h-3 rounded-full bg-[#EAE4DB]" />
                  <div className="w-3 h-3 rounded-full bg-[#EAE4DB]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-[#FAFAF7] text-xs text-[#766E66] font-mono">
                    evalisacademy.it/dashboard
                  </div>
                </div>
              </div>
              <DashboardMockup />
            </div>
            <p className="mt-4 text-center text-xs text-[#766E66]">
              ← Tocca il menu per esplorare la dashboard
            </p>
          </div>
        </div>
      </div>
    </section>);

}