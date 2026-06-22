import React from "react";
import { BadgeCheck, HardHat, Briefcase, ArrowRight } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const profiles = [
  {
    icon: BadgeCheck,
    title: "Auditor",
    description:
      "Professionisti che conducono o supportano audit sui sistemi di gestione ISO.",
    href: "#catalogo",
    linkLabel: "Corsi Auditor",
  },
  {
    icon: HardHat,
    title: "Tecnici e mestieri",
    description:
      "Elettricisti, idraulici, muratori e altre professioni specialistiche.",
    href: "#catalogo",
    linkLabel: "Corsi professionali",
  },
  {
    icon: Briefcase,
    title: "Aziende",
    description:
      "Organizzazioni che devono certificare i propri professionisti e tecnici.",
    href: "/aziende",
    linkLabel: "Soluzioni per aziende",
  },
];

function ProfileCard({ profile }) {
  return (
    <a
      href={profile.href}
      className="group flex flex-col bg-white border border-[#EAE4DB] rounded-2xl p-6 md:p-8 text-left hover:-translate-y-1 hover:border-primary transition-all duration-200 hover:shadow-[0_12px_32px_rgba(26,18,9,0.12)] h-full"
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-near-black text-primary mb-5">
        <profile.icon className="h-6 w-6" />
      </span>
      <h3 className="font-heading text-xl text-near-black group-hover:text-primary transition-colors duration-200">
        {profile.title}
      </h3>
      <p className="mt-2 text-sm text-[#5C5347] leading-relaxed flex-1">
        {profile.description}
      </p>
      <span className="mt-5 text-sm font-medium text-primary inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform duration-200">
        {profile.linkLabel}
        <ArrowRight className="h-4 w-4" />
      </span>
    </a>
  );
}

export default function ForWhoSection() {
  return (
    <section className="w-full py-20 md:py-24 bg-cream-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="max-w-xl text-left mb-10">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Per chi è
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              A chi si rivolge Evalis
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <ScrollReveal className="h-full">
            <ProfileCard profile={profiles[0]} />
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-5 items-stretch h-full">
            <ScrollReveal delay={0.08} className="h-full">
              <ProfileCard profile={profiles[1]} />
            </ScrollReveal>
            <ScrollReveal delay={0.16} className="h-full">
              <ProfileCard profile={profiles[2]} />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}