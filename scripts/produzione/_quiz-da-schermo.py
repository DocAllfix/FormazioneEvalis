# Le domande di verifica GENERATE si leggono a schermo, non si ascoltano: qui si riportano in forma da
# schermo i numeri scritti in lettere (forma pensata per la voce) e le sigle sciolte per la voce
# («ci o due equivalente» → CO2e). Le domande del committente (origine «committente») non si toccano.
# Stampa ogni modifica (prima → dopo) e scrive solo con --scrivi.
# Uso: python scripts/produzione/_quiz-da-schermo.py <corso> [--scrivi]
import json, os, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
exec(open("scripts/produzione/_numeri-parlato.py", encoding="utf-8").read().split("def stretto")[0])

corso, scrivi = sys.argv[1], "--scrivi" in sys.argv
p = Path(f"produzione/{corso}/copioni.json")
c = json.loads(p.read_text(encoding="utf-8"))
SIGLE = [("ci o due equivalente", "CO2e"), ("Ci o due equivalente", "CO2e"), ("ci o due", "CO2"), ("Ci o due", "CO2"),
         ("gi vu pi", "GWP")]


def cifre(v: float, dec: int) -> str:
    s = f"{v:,.{dec}f}".replace(",", "§").replace(".", ",").replace("§", ".")
    return s


def converti(t: str) -> str:
    for a, b in SIGLE:
        t = t.replace(a, b)
    # «cinque per cento», «l'uno per cento»: la percentuale va in cifre anche quando il numero è piccolo
    def pc(m):
        v = parola(m.group(2))
        return f"{m.group(1) or ''}{v}%" if v is not None else m.group(0)
    t = re.sub(r"(l')?([a-zà-ù]+) per cento", pc, t, flags=re.I)
    # dal fondo, così gli indici restano validi
    for v, dec, fr, avv in reversed(numeri_del_testo(t)):
        if v != v or (dec == 0 and v < 13): continue
        i = t.rfind(fr)
        if i >= 0: t = t[:i] + cifre(v, dec) + t[i + len(fr):]
    t = re.sub(r"(\d) %", r"\1%", t)
    return t


n = 0
for m, blocco in c["checkpoint"].items():
    for q in blocco["banca"]:
        if q.get("origine") == "committente": continue
        nuovo_q, nuove_o = converti(q["q"]), [converti(o) for o in q["opzioni"]]
        if nuovo_q != q["q"] or nuove_o != q["opzioni"]:
            n += 1
            print(f"[{m}] {q['q']}\n   → {nuovo_q}")
            for a, b in zip(q["opzioni"], nuove_o):
                if a != b: print(f"     · {a}  →  {b}")
            if len(set(nuove_o)) != len(nuove_o): sys.exit(f"opzioni diventate uguali: {nuove_o}")
            q["q"], q["opzioni"] = nuovo_q, nuove_o
print(f"domande convertite: {n}")
if scrivi:
    p.with_suffix(".json.tmp").write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(p.with_suffix(".json.tmp"), p)
    print("scritto", p)
