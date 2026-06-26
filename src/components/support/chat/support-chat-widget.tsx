"use client";

// Widget chatbot di supporto. Streaming token-by-token (fetch + ReadableStream), memoria della
// conversazione (lo storico viene reinviato a ogni messaggio), auto-scroll, suggerimenti iniziali,
// e CTA "Apri un ticket" che trasferisce la trascrizione all'assistenza (Fase 2A).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LifeBuoy, Loader2, MessageCircle, Send, X } from "lucide-react";
import { createMyTicketAction } from "@/features/support/server-actions";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Come verifico un certificato?",
  "Come funziona l'esame finale?",
  "Quanto tempo devo guardare le lezioni?",
];

export function SupportChatWidget({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [openingTicket, setOpeningTicket] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!enabled) return null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError("");
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error(res.status === 401 ? "Sessione scaduta." : "Servizio non disponibile.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => m.slice(0, -1)); // rimuovi il placeholder assistant
      setError(e instanceof Error ? e.message : "Errore.");
    } finally {
      setStreaming(false);
    }
  }

  async function openTicket() {
    if (messages.length === 0 || openingTicket) return;
    setOpeningTicket(true);
    setError("");
    try {
      const firstUser = messages.find((m) => m.role === "user")?.content ?? "Richiesta dal chatbot";
      const transcript = messages
        .map((m) => `${m.role === "user" ? "Discente" : "Assistente"}: ${m.content}`)
        .join("\n\n");
      const subject = firstUser.length > 80 ? `${firstUser.slice(0, 77)}…` : firstUser;
      const { id } = await createMyTicketAction(subject, `Trascrizione chat:\n\n${transcript}`);
      setOpen(false);
      router.push(`/assistenza/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'apertura del ticket.");
    } finally {
      setOpeningTicket(false);
    }
  }

  return (
    <>
      {/* Bottone flottante */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Assistente"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:brightness-110 hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Pannello */}
      {open ? (
        <div className="fixed bottom-24 right-5 z-50 flex h-[34rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-near-black">Assistente Evalis</p>
              <p className="text-[11px] text-muted-foreground">Risponde dalle FAQ e dai corsi</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ciao! Come posso aiutarti? Prova a chiedere:</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-near-black transition hover:border-primary/40 hover:bg-secondary/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user" ? "bg-primary text-white" : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {m.content || (streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                  </div>
                </div>
              ))
            )}
          </div>

          {error ? <p className="px-4 pb-1 text-xs text-destructive">{error}</p> : null}

          <div className="border-t border-border px-3 py-2.5">
            {messages.length > 0 ? (
              <button
                onClick={openTicket}
                disabled={openingTicket}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {openingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LifeBuoy className="h-3.5 w-3.5" />}
                Non risolto? Apri un ticket
              </button>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi un messaggio…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Invia"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
