"use client";

// Carica il widget chatbot in un chunk separato, SOLO lato client e dopo l'idratazione
// (ssr:false). Toglie l'intera logica di streaming/AI dal bundle iniziale di OGNI pagina
// (app): il widget flottante non serve al primo paint.

import dynamic from "next/dynamic";

const SupportChatWidget = dynamic(
  () => import("./support-chat-widget").then((m) => m.SupportChatWidget),
  { ssr: false },
);

export function LazySupportChat({ enabled }: { enabled: boolean }) {
  return <SupportChatWidget enabled={enabled} />;
}
