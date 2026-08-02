// Esporta un report HTML in PDF A4 mantenendo lo stile (stampa con sfondi).
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [src, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: "networkidle" });
await p.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  margin: { top: "22mm", bottom: "22mm", left: "18mm", right: "18mm" },
});
await b.close();
console.log("PDF creato:", out);
