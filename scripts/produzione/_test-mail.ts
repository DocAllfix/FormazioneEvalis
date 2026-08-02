import "dotenv/config";
import { Resend } from "resend";
const key = process.env.RESEND_API_KEY;
if (!key) { console.log("RESEND_API_KEY assente in locale"); process.exit(1); }
const from = process.env.RESEND_FROM ?? "Evalis Academy <no-reply@evalisacademy.it>";
console.log("from:", from, "| key:", key.slice(0,8)+"…");
const resend = new Resend(key);
const res = await resend.emails.send({
  from,
  to: "alessiokenan@gmail.com",
  subject: "TEST consegna Evalis Academy",
  html: "<p>Se leggi questa email, la consegna Resend funziona. (test diagnostico)</p>",
});
console.log("RISULTATO:", JSON.stringify(res).slice(0, 300));
process.exit(0);
