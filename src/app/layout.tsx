import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormazioneEvalis",
  description: "Piattaforma di erogazione corsi di formazione professionale.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
