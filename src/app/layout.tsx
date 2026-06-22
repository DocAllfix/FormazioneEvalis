import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evalis — Certifica le tue competenze professionali",
  description:
    "Preparazione online, esame di verifica e certificato verificabile con QR. Auditor ISO, mestieri e professioni, settore bancario.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
