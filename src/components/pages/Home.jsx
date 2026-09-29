"use client";
import React from "react";
import SiteHeader from "@/components/landing/SiteHeader";
import BentoHero from "@/components/landing/BentoHero";
import StatsSection from "@/components/landing/StatsSection";
import ISOStrip from "@/components/landing/ISOStrip";
import CatalogSection from "@/components/landing/CatalogSection";
import ForWhoSection from "@/components/landing/ForWhoSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import VerifySection from "@/components/landing/VerifySection";
import DualPathSection from "@/components/landing/DualPathSection";
import WhyEvalisSection from "@/components/landing/WhyEvalisSection";
import CertisExplainer from "@/components/landing/CertisExplainer";
import PlatformSection from "@/components/landing/PlatformSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import SiteFooter from "@/components/landing/SiteFooter";
import { BundleStrip } from "@/components/catalog/bundle-strip";

/** @param {{ auditorCourses?: import("@/features/catalog/vetrina").VetrinaCourse[], aiCourses?: import("@/features/catalog/vetrina").VetrinaCourse[], managerialiCourses?: import("@/features/catalog/vetrina").VetrinaCourse[], bundles?: import("@/features/catalog/queries").CatalogBundle[] }} props */
export default function Home({ auditorCourses = [], aiCourses = [], managerialiCourses = [], bundles = [] }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a href="#main-content" className="skip-link">
        Vai al contenuto principale
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <BentoHero />
        <StatsSection />
        <ISOStrip />
        <CatalogSection auditorCourses={auditorCourses} aiCourses={aiCourses} managerialiCourses={managerialiCourses} />
        {bundles.length > 0 ? (
          // pacchetti subito dopo i corsi: stessa vetrina dell'area riservata, prezzo e risparmio compresi
          <section className="w-full bg-background pb-20 md:pb-24">
            <div className="max-w-[1400px] mx-auto px-6 md:px-10">
              <BundleStrip bundles={bundles} pubblico />
            </div>
          </section>
        ) : null}
        <ForWhoSection />
        <HowItWorksSection />
        <VerifySection />
        <DualPathSection />
        <WhyEvalisSection />
        <CertisExplainer />
        <PlatformSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}