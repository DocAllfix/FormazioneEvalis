import React, { useState } from "react";
import { Download, FileText, Bell, Globe, Check } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ProgressBar, StatusPill, Avatar } from "./ConsoleBits";

const consoleRows = [
  { name: "Marco Rossi", email: "m.rossi@acme.it", initials: "MR", cert: "ISO 9001", progress: 85, status: "Pronto per l'esame", action: "Scarica report" },
  { name: "Laura Bianchi", email: "l.bianchi@acme.it", initials: "LB", cert: "ISO 14001", progress: 100, status: "Certificato", action: "Vedi certificato" },
  { name: "Giovanni Mele", email: "g.mele@acme.it", initials: "GM", cert: "ISO 45001", progress: 42, status: "In corso", action: "Scarica report" },
  { name: "Sara Conti", email: "s.conti@acme.it", initials: "SC", cert: "ISO 9001", progress: 0, status: "Non iniziato", action: "Assegna" },
  { name: "Tommaso Ferri", email: "t.ferri@acme.it", initials: "TF", cert: "Elettricista spec.", progress: 67, status: "In corso", action: "Scarica report" },
];

const percorsiRows = [
  { name: "ISO 9001 · Auditor", assigned: 3, certified: 1, progress: 67 },
  { name: "ISO 14001 · Auditor", assigned: 1, certified: 1, progress: 100 },
  { name: "ISO 45001 · Auditor", assigned: 1, certified: 0, progress: 42 },
  { name: "Elettricista specializzato", assigned: 1, certified: 0, progress: 67 },
];

const reportStats = [
  { label: "Certificati emessi", value: 2, color: "text-[#27500A]", bg: "bg-[#F0FAE8]" },
  { label: "In preparazione", value: 3, color: "text-[#633806]", bg: "bg-[#FAEEDA]" },
  { label: "Non iniziati", value: 1, color: "text-[#766E66]", bg: "bg-[#F1EFE8]" },
];

const tabs = ["Persone", "Percorsi", "Report", "Impostazioni"];

function PersoneTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#766E66] border-b border-[#EAE4DB]">
            <th className="px-6 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Certificazione</th>
            <th className="px-4 py-3 font-medium">% Preparazione</th>
            <th className="px-4 py-3 font-medium">Stato</th>
            <th className="px-6 py-3 font-medium text-right">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {consoleRows.map((row) => (
            <tr key={row.name} className="border-b border-[#F5EFE6] last:border-0 hover:bg-[#FAFAF7] transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={row.initials} />
                  <div>
                    <p className="text-near-black font-medium whitespace-nowrap">{row.name}</p>
                    <p className="text-xs text-[#766E66] whitespace-nowrap">{row.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-[#5C5347] whitespace-nowrap">{row.cert}</td>
              <td className="px-4 py-4"><div className="w-24"><ProgressBar value={row.progress} /></div></td>
              <td className="px-4 py-4"><StatusPill status={row.status} /></td>
              <td className="px-6 py-4 text-right"><span className="text-primary text-xs font-medium hover:underline cursor-pointer whitespace-nowrap">{row.action}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PercorsiTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#766E66] border-b border-[#EAE4DB]">
            <th className="px-6 py-3 font-medium">Percorso</th>
            <th className="px-4 py-3 font-medium">Persone assegnate</th>
            <th className="px-4 py-3 font-medium">Certificati ottenuti</th>
            <th className="px-4 py-3 font-medium">% Completamento</th>
            <th className="px-6 py-3 font-medium text-right">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {percorsiRows.map((row) => (
            <tr key={row.name} className="border-b border-[#F5EFE6] last:border-0 hover:bg-[#FAFAF7] transition-colors">
              <td className="px-6 py-4 text-near-black font-medium whitespace-nowrap">{row.name}</td>
              <td className="px-4 py-4 text-[#5C5347] whitespace-nowrap">{row.assigned}</td>
              <td className="px-4 py-4 text-[#5C5347] whitespace-nowrap">{row.certified}</td>
              <td className="px-4 py-4"><div className="w-24"><ProgressBar value={row.progress} /></div></td>
              <td className="px-6 py-4 text-right"><span className="text-primary text-xs font-medium hover:underline cursor-pointer whitespace-nowrap">Gestisci</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportTab() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {reportStats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} border border-[#E8E0D5] rounded-xl p-5`}>
            <p className="text-xs text-[#5C5347]">{stat.label}</p>
            <p className={`mt-1.5 font-heading text-3xl ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 border border-[#E8E0D5] rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#F5EFE6] text-primary">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-near-black">Report globale del team</p>
            <p className="text-xs text-[#766E66]">PDF con stato preparazione e certificati per tutte le persone</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2.5 hover:brightness-110 transition-all whitespace-nowrap">
          <Download className="h-4 w-4" /> Scarica PDF
        </button>
      </div>
    </div>
  );
}

function ImpostazioniTab() {
  return (
    <div className="p-6 max-w-lg">
      <div className="space-y-5">
        <div>
          <label className="text-[13px] text-near-black font-medium">Nome azienda</label>
          <div className="mt-1.5 px-3.5 py-2.5 bg-[#FAFAF7] border border-[#E8E0D5] rounded-lg text-sm text-near-black">Acme S.r.l.</div>
        </div>
        <div>
          <label className="text-[13px] text-near-black font-medium">Sottodominio</label>
          <div className="mt-1.5 flex items-center gap-2 px-3.5 py-2.5 bg-[#FAFAF7] border border-[#E8E0D5] rounded-lg">
            <Globe className="h-4 w-4 text-[#766E66]" />
            <span className="text-sm text-near-black">acme.evalis.it</span>
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-[#5C5347]" />
            <span className="text-sm text-near-black">Notifiche email</span>
          </div>
          <button className="relative w-10 h-6 rounded-full bg-primary">
            <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white" />
          </button>
        </div>
        <div>
          <label className="text-[13px] text-near-black font-medium">Lingua</label>
          <div className="mt-1.5 px-3.5 py-2.5 bg-[#FAFAF7] border border-[#E8E0D5] rounded-lg text-sm text-near-black">Italiano</div>
        </div>
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2.5 hover:brightness-110 transition-all">
          <Check className="h-4 w-4" /> Salva modifiche
        </button>
      </div>
    </div>
  );
}

export default function ConsoleMockupSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="w-full py-20 md:py-24 bg-cream-dark">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">La console</span>
          <h2 className="mt-3.5 font-heading text-4xl md:text-5xl text-near-black leading-[1.1]">Tutto il team, in un'unica schermata.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="mt-10 bg-white border border-[#E8E0D5] rounded-[14px] overflow-hidden" style={{ boxShadow: "0 16px 48px rgba(26,18,9,0.08)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4DB]">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-white text-sm font-heading">AC</span>
                <span className="font-body font-medium text-near-black">Gestione certificazioni · Acme S.r.l.</span>
              </div>
              <a href="#contatti" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                Scarica report globale <Download className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-1 px-6 border-b border-[#EAE4DB] overflow-x-auto">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === i ? "border-primary text-near-black" : "border-transparent text-[#766E66] hover:text-near-black"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {activeTab === 0 && <PersoneTab />}
            {activeTab === 1 && <PercorsiTab />}
            {activeTab === 2 && <ReportTab />}
            {activeTab === 3 && <ImpostazioniTab />}
            <div className="px-6 py-3 border-t border-[#EAE4DB] text-xs text-[#766E66]">
              5 persone · 2 certificati ottenuti · Ultimo aggiornamento: oggi
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}