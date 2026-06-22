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

export default function Home() {
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
        <CatalogSection />
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