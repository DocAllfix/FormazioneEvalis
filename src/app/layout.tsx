import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import { JsonLd } from "@/components/seo/json-ld";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { COMPANY } from "@/lib/legal/company";

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

// Entità dell'organizzazione per Knowledge Graph e motori di risposta AI: oltre a nome e
// descrizione servono logo, dati legali e recapiti, altrimenti il soggetto resta una pagina
// web anonima invece di un ente riconoscibile e citabile.
const orgLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${APP_URL}/#organization`,
  name: "Evalis Academy",
  legalName: COMPANY.legalName,
  alternateName: COMPANY.brand,
  url: APP_URL,
  logo: { "@type": "ImageObject", url: `${APP_URL}/brand/monogram.png` },
  image: `${APP_URL}/brand/monogram.png`,
  description:
    "Piattaforma di formazione e certificazione delle competenze professionali: percorsi Auditor e Lead Auditor ISO, mestieri e professioni, competenze digitali e intelligenza artificiale.",
  vatID: COMPANY.vat,
  taxID: COMPANY.vat,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Via Sandro Botticelli 25",
    postalCode: "81031",
    addressLocality: "Aversa",
    addressRegion: "CE",
    addressCountry: "IT",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: COMPANY.email,
      telephone: COMPANY.phone,
      areaServed: "IT",
      availableLanguage: ["it"],
    },
  ],
  sameAs: [`https://${COMPANY.parentSite}`],
  parentOrganization: { "@type": "Organization", name: COMPANY.legalName, url: `https://${COMPANY.parentSite}` },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransitions>
      <html lang="it" className={`${dmSans.variable} ${dmSerif.variable}`}>
        <body>
          <JsonLd data={orgLd} />
          {children}
          <CookieBanner />
        </body>
      </html>
    </ViewTransitions>
  );
}
