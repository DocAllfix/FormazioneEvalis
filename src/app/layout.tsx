import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/seo/json-ld";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

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
  metadataBase: new URL(APP_URL),
  title: {
    default: "Evalis — Certifica le tue competenze professionali",
    template: "%s",
  },
  description:
    "Preparazione online, esame di verifica e certificato verificabile con QR. Auditor ISO, mestieri e professioni, settore bancario.",
  openGraph: { siteName: "Evalis", locale: "it_IT", type: "website" },
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Evalis",
  url: APP_URL,
  description: "Piattaforma di certificazione delle competenze professionali.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body>
        <JsonLd data={orgLd} />
        {children}
      </body>
    </html>
  );
}
