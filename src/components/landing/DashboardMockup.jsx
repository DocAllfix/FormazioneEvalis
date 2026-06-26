import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  ClipboardCheck,
  Search,
  User,
  Check,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { id: "percorsi", label: "I miei percorsi", icon: BookOpen },
  { id: "esame", label: "Esame", icon: ClipboardCheck },
  { id: "verifica", label: "Verifica", icon: Search },
  { id: "profilo", label: "Profilo", icon: User },
];

export default function DashboardMockup() {
  const [active, setActive] = useState("percorsi");

  return (
    <div
      className="flex flex-col bg-[#FAFAF7] text-sm select-none"
      style={{ minHeight: "440px" }}
    >
      <div className="md:hidden flex gap-1 p-2 bg-white border-b border-[#EAE4DB] overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              active === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-[#766E66]"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1">
        <div className="w-48 bg-white border-r border-[#EAE4DB] p-4 hidden md:flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/monogram.png" alt="" className="w-7 h-7 object-contain shrink-0" />
            <span className="font-body font-medium text-sm text-near-black">
              Evalis Academy
            </span>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                  active === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-[#5C5347] hover:bg-[#FAFAF7]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-5 md:p-6 text-left overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {active === "percorsi" && <PercorsiView />}
              {active === "esame" && <EsameView />}
              {active === "verifica" && <VerificaView />}
              {active === "profilo" && <ProfiloView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PercorsiView() {
  return (
    <>
      <h3 className="font-body font-medium text-base text-near-black mb-1">
        I miei percorsi
      </h3>
      <p className="text-xs text-[#766E66] mb-5">3 percorsi attivi</p>
      <div className="space-y-3">
        <PathCard name="ISO 9001 Qualità" subtitle="Auditor sistemi di gestione" progress={85} isActive />
        <PathCard name="ISO 14001 Ambiente" subtitle="Auditor sistemi di gestione" progress={40} />
        <PathCard name="Elettricista specializzato" subtitle="Corso professionale" completed />
      </div>
    </>
  );
}

function EsameView() {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-body font-medium text-base text-near-black">
          Esame · ISO 9001 Qualità
        </h3>
        <span className="text-xs font-mono text-[#766E66]">14:32</span>
      </div>
      <p className="text-xs text-[#766E66] mb-4">Domanda 3 di 20</p>
      <div className="w-full h-1.5 bg-[#FAFAF7] rounded-full mb-5">
        <div className="h-full bg-primary rounded-full" style={{ width: "15%" }} />
      </div>
      <p className="text-sm font-medium text-near-black mb-4 leading-relaxed">
        Quale tra i seguenti non è un principio di gestione della qualità secondo
        la ISO 9001?
      </p>
      <div className="space-y-2">
        <ExamOption label="A" text="Approccio per processi" />
        <ExamOption label="B" text="Miglioramento continuo" />
        <ExamOption label="C" text="Massimizzazione del profitto" selected />
        <ExamOption label="D" text="Orientamento al cliente" />
      </div>
      <div className="mt-5 flex justify-end">
        <span className="bg-primary text-white text-sm font-medium py-2 px-5 rounded-lg">
          Avanti
        </span>
      </div>
    </>
  );
}

function VerificaView() {
  return (
    <>
      <h3 className="font-body font-medium text-base text-near-black mb-1">
        Verifica certificato
      </h3>
      <p className="text-xs text-[#766E66] mb-5">Inserisci il codice univoco</p>
      <div className="flex gap-2 mb-5">
        <div className="flex-1 h-10 bg-[#FAFAF7] border border-[#EAE4DB] rounded-lg px-3 flex items-center text-sm text-near-black font-mono">
          EV-2026-9001-0142
        </div>
        <div className="h-10 w-10 flex items-center justify-center bg-primary text-white rounded-lg">
          <Search className="h-4 w-4" />
        </div>
      </div>
      <div className="bg-[#15803D]/5 border border-[#15803D]/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#15803D]/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-[#15803D]" />
          </div>
          <p className="font-body font-medium text-sm text-[#15803D]">
            Certificato valido
          </p>
        </div>
        <div className="space-y-2 text-xs">
          <VerifyRow label="Titolare" value="Marco Rossi" />
          <VerifyRow label="Corso" value="ISO 9001 Qualità" />
          <VerifyRow label="Emesso il" value="15/03/2026" />
          <VerifyRow label="Codice" value="EV-2026-9001-0142" />
        </div>
      </div>
    </>
  );
}

function ProfiloView() {
  return (
    <>
      <h3 className="font-body font-medium text-base text-near-black mb-1">
        Profilo
      </h3>
      <p className="text-xs text-[#766E66] mb-5">Le tue informazioni e corsi</p>
      <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-lg border border-[#EAE4DB]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-body font-medium text-sm text-near-black">Marco Rossi</p>
          <p className="text-xs text-[#766E66]">marco.rossi@email.it</p>
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium mb-3">
        Corsi ottenuti
      </p>
      <div className="bg-white rounded-lg border border-[#EAE4DB] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#15803D]/5 border border-[#15803D]/20 flex items-center justify-center">
          <Check className="h-5 w-5 text-[#15803D]" />
        </div>
        <div>
          <p className="font-body font-medium text-sm text-near-black">
            Elettricista specializzato
          </p>
          <p className="text-xs text-[#766E66]">Certificato ottenuto · 15/03/2026</p>
        </div>
      </div>
    </>
  );
}

function PathCard({ name, subtitle, progress, completed, isActive }) {
  return (
    <div className="bg-white rounded-lg border border-[#EAE4DB] p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex items-center gap-2">
          {isActive && (
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          <div className="min-w-0">
            <p className="font-body font-medium text-sm text-near-black truncate">{name}</p>
            <p className="text-xs text-[#766E66]">{subtitle}</p>
          </div>
        </div>
        {completed ? (
          <span className="text-xs font-medium text-[#15803D] bg-[#15803D]/5 border border-[#15803D]/20 px-2 py-0.5 rounded-full whitespace-nowrap">
            Certificato ottenuto
          </span>
        ) : (
          <span className="text-xs font-medium text-near-black whitespace-nowrap">{progress}%</span>
        )}
      </div>
      {!completed && (
        <div className="w-full h-2 bg-[#FAFAF7] rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function ExamOption({ label, text, selected }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-default transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-[#EAE4DB] bg-white hover:bg-[#FAFAF7]"
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          selected ? "bg-primary text-white" : "bg-[#FAFAF7] text-[#766E66]"
        }`}
      >
        {label}
      </span>
      <span className={`text-sm ${selected ? "text-near-black font-medium" : "text-[#5C5347]"}`}>
        {text}
      </span>
    </div>
  );
}

function VerifyRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#766E66]">{label}</span>
      <span className="text-near-black font-medium">{value}</span>
    </div>
  );
}