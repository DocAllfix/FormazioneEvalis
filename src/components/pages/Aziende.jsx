"use client";
import React from "react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import AziendeHero from "@/components/aziende/AziendeHero";
import WhyCertifySection from "@/components/aziende/WhyCertifySection";
import HowItWorksSection from "@/components/aziende/HowItWorksSection";
import ConsoleMockupSection from "@/components/aziende/ConsoleMockupSection";
import FeaturesSection from "@/components/aziende/FeaturesSection";
import DedicatedSpaceSection from "@/components/aziende/DedicatedSpaceSection";
import SecuritySection from "@/components/aziende/SecuritySection";
import ContactFormSection from "@/components/aziende/ContactFormSection";
import AziendeFAQ from "@/components/aziende/AziendeFAQ";
import AziendeFinalCTA from "@/components/aziende/AziendeFinalCTA";

export default function Aziende() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <AziendeHero />
        <WhyCertifySection />
        <HowItWorksSection />
        <ConsoleMockupSection />
        <FeaturesSection />
        <DedicatedSpaceSection />
        <SecuritySection />
        <ContactFormSection />
        <AziendeFAQ />
        <AziendeFinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}