import { chromium } from "@playwright/test";
import path from "node:path";
const b = await chromium.launch();
const files = ["1-verifica-email", "2-reset-password", "3-invito-azienda", "4-attestato"];
for (const f of files) {
  const p = await b.newPage({ viewport: { width: 680, height: 760 } });
  await p.goto("file://" + path.resolve("produzione/_email-preview/" + f + ".html").replace(/\\/g, "/"));
  await p.waitForTimeout(300);
  await p.screenshot({ path: "produzione/_email-preview/" + f + ".png", fullPage: true });
  await p.close();
}
await b.close();
console.log("shot ok");
