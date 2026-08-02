// Rasterizza il SVG del logo (senza il rettangolo di sfondo crema) in un PNG trasparente
// ad alta risoluzione e nitido. Output: produzione/_email-preview/_logo-crisp.png
import { chromium } from "@playwright/test";
import fs from "node:fs";

const SVG = "logosvg/brand-logo-lockup-for--evalis-academy---keep-the-a (1).svg";
let svg = fs.readFileSync(SVG, "utf8");
// rimuove SOLO il path di sfondo (rettangolo pieno #F9F8EE a tutta tela), non gli highlight interni
svg = svg.replace('<path fill="#F9F8EE" transform="scale(1.23077 1.23077)" d="M0 0L832 0L832 1248L0 1248L0 0Z"/>', "");

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 1536 }, deviceScaleFactor: 2 });
await p.setContent(`<body style="margin:0;padding:0">${svg}</body>`, { waitUntil: "networkidle" });
const el = await p.$("svg");
await el.screenshot({ path: "produzione/_email-preview/_logo-crisp.png", omitBackground: true });
await b.close();
console.log("logo nitido salvato: produzione/_email-preview/_logo-crisp.png");
