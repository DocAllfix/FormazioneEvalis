import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/email/layout";

// L'indirizzo del bottone non può uscire dall'attributo href, ma gli indirizzi veri (con ? e &)
// devono restare identici: verifica email e reset password ne dipendono.
describe("renderEmail — link del bottone", () => {
  it("un indirizzo con virgolette e tag non esce dall'attributo", () => {
    const html = renderEmail({
      previewText: "p",
      heading: "h",
      body: [],
      button: { label: "Accetta", url: 'https://b"><b>x.example.test/accept-invitation/1' },
    });
    expect(html).not.toContain('"><b>');
    expect(html).toContain("&quot;&gt;&lt;b&gt;");
  });

  it("gli indirizzi veri restano identici", () => {
    const url = "http://localhost:3100/api/auth/reset-password/AbC123?callbackURL=%2Freimposta-password&x=1";
    const html = renderEmail({ previewText: "p", heading: "h", body: [], button: { label: "Vai", url } });
    expect(html).toContain(`href="${url}"`);
    expect(html.split(url).length - 1).toBe(3); // bottone + href di riserva + testo di riserva
  });
});
