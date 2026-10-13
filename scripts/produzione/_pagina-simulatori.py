# Pagina di revisione dei calcolatori interattivi di un corso: per ogni slide «simulatore» la slide vera
# (funzionante, nello stesso riquadro isolato del player) accanto al parlato completo della slide, per
# controllare a occhio che l'audio racconti proprio il conto che l'allievo può provare.
# Uso: python scripts/produzione/_pagina-simulatori.py <corso>  → produzione/<corso>/<corso>-calcolatori.html
import html, json, re, sys
from pathlib import Path
corso = sys.argv[1]
base = Path(f"produzione/{corso}")
cop = {s["id"]: s for s in json.loads((base / "copioni.json").read_text(encoding="utf-8"))["slides"]}
voci = []
for f in sorted((base / "_slide-src").glob(f"{corso}-m*-contenuti.json")):
    for x in json.loads(f.read_text(encoding="utf-8")):
        if x["layout"] != "simulatore": continue
        full = Path(f"slide-in/{corso}/{x['id']}.html").read_text(encoding="utf-8")
        sec = re.search(r"<section\b[\s\S]*</section>", full).group(0)
        doc = ('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'
               '<style>html,body{margin:0;overflow:hidden}</style></head><body>' + sec + '</body></html>')
        nuovo = "nuovo" if x.get("_schermata") else "dal generatore"
        testo = "".join(f"<p>{html.escape(p)}</p>" for p in cop[x["id"]]["testo"].split("\n") if p.strip())
        voci.append(f'''<article><h2>{x["id"].replace(corso + "_", "").replace("_", " · ").upper()} — {html.escape(x["titolo"])} <small>({nuovo})</small></h2>
<div class="riga"><div class="slide"><iframe sandbox="allow-scripts" srcdoc="{html.escape(doc, quote=True)}"></iframe></div>
<div class="parlato"><b>Parlato della slide</b>{testo}</div></div></article>''')
pagina = f'''<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Calcolatori interattivi — {corso}</title>
<style>body{{font:15px/1.5 system-ui;margin:0;padding:24px;background:#EEF2F5;color:#142A3E}}h1{{margin:0 0 6px}}article{{background:#fff;border-radius:10px;padding:16px;margin:0 0 22px}}
h2{{font-size:17px;margin:0 0 10px}}small{{color:#6B7E90;font-weight:400}}.riga{{display:flex;gap:18px;align-items:flex-start}}
.slide{{flex:0 0 768px;height:620px;overflow:hidden;border:1px solid #DCE4EA;border-radius:6px}}iframe{{width:1280px;height:1040px;border:0;transform:scale(.6);transform-origin:0 0}}
.parlato{{flex:1;min-width:0;max-height:620px;overflow:auto;font-size:14px;color:#33475B}}.parlato p{{margin:6px 0}}</style></head><body>
<h1>Calcolatori interattivi — {len(voci)} slide</h1><p>Ogni slide funziona: cambia un numero nelle caselle e il totale si ricalcola. Accanto, il parlato completo della slide.</p>
{"".join(voci)}</body></html>'''
out = base / f"{corso}-calcolatori.html"
out.write_text(pagina, encoding="utf-8")
print(out, len(voci), "calcolatori")
