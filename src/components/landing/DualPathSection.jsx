import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Building2, User, Check } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function DualPathSection() {
  const [form, setForm] = useState({ azienda: "", email: "", persone: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section
      id="aziende"
      className="w-full py-20 md:py-24 bg-background scroll-mt-16"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="max-w-2xl text-left mb-14">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary font-medium">
              Due percorsi
            </span>
            <h2 className="mt-3.5 font-heading text-4xl md:text-5xl lg:text-[56px] text-near-black leading-[1.1]">
              Per te. Per il tuo team.
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* B2C Card — light */}
          <ScrollReveal>
            <div className="bg-white border border-[#EAE4DB] rounded-[20px] p-8 md:p-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-near-black text-primary">
                  <User className="h-6 w-6" />
                </span>
                <h3 className="font-heading text-xl text-near-black">
                  Per i privati
                </h3>
              </div>
              <p className="text-[#5C5347] text-base leading-relaxed mb-6">
                Scegli il corso, preparati online e sostieni l'esame.
                Al superamento ottieni il certificato professionale verificabile
                con QR.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Preparazione online con contenuti tracciati",
                  "Esame con verifica delle competenze",
                  "Certificato verificabile da chiunque",
                  "Percorso a tuo ritmo, da qualsiasi dispositivo",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-near-black"
                  >
                    <Check
                      className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium rounded-lg px-6 h-12 w-full text-base hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
                >
                  Esplora i corsi
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-[#766E66]">
                Oppure{" "}
                <Link
                  href="/registrati"
                  className="underline hover:text-primary transition-colors"
                >
                  crea un account
                </Link>
                .
              </p>
            </div>
          </ScrollReveal>

          {/* B2B Card — dark */}
          <ScrollReveal delay={0.1}>
            <div className="bg-near-black text-white rounded-[20px] p-8 md:p-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-primary text-white">
                  <Building2 className="h-6 w-6" />
                </span>
                <h3 className="font-heading text-xl text-white">
                  Per le aziende
                </h3>
              </div>
              <p className="text-[#9C9388] text-base leading-relaxed mb-6">
                Certifica i tuoi professionisti e tecnici con gestione
                centralizzata e verificabile. Assegni i percorsi, monitori lo
                stato di preparazione e corso, scarichi la
                reportistica.
              </p>

              {submitted ? (
                <div className="bg-primary/15 border border-primary/30 rounded-lg p-5 text-sm text-white mt-auto">
                  <p className="font-medium flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Richiesta inviata
                  </p>
                  <p className="mt-1.5 text-[#9C9388]">
                    Ti contatteremo entro 24 ore lavorative.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 mt-auto"
                >
                  <div>
                    <Label
                      htmlFor="azienda"
                      className="text-sm font-medium text-white/90"
                    >
                      Nome azienda
                    </Label>
                    <Input
                      id="azienda"
                      required
                      value={form.azienda}
                      onChange={(e) =>
                        setForm({ ...form, azienda: e.target.value })
                      }
                      placeholder="Es. Rossi S.r.l."
                      className="mt-1.5 h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="email-azienda"
                      className="text-sm font-medium text-white/90"
                    >
                      Email aziendale
                    </Label>
                    <Input
                      id="email-azienda"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="nome@azienda.it"
                      className="mt-1.5 h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="persone"
                      className="text-sm font-medium text-white/90"
                    >
                      Numero di persone da certificare
                    </Label>
                    <Input
                      id="persone"
                      type="number"
                      min="1"
                      required
                      value={form.persone}
                      onChange={(e) =>
                        setForm({ ...form, persone: e.target.value })
                      }
                      placeholder="Es. 25"
                      className="mt-1.5 h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium rounded-lg px-6 h-12 w-full text-base hover:brightness-110 hover:scale-[1.02] transition-all duration-200 mt-2"
                  >
                    Richiedi informazioni
                  </button>
                </form>
              )}
              <p className="mt-4 text-xs text-white/50">
                Oppure{" "}
                <Link
                  href="/registrati?tipo=azienda"
                  className="underline hover:text-white transition-colors"
                >
                  crea un account azienda
                </Link>
                .
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}