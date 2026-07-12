#!/usr/bin/env python3
"""Report monte-ore REALE del catalogo audio (dai registri Azure _log/audio-*.json).

Per corso: somma delle durate reali vs minuti legali (budget.minutiLegali dei copioni),
dettaglio per modulo, slide con scostamento stima >±20% (da riascoltare a campione).
Scrive produzione/asset/audio-report.json e stampa la tabella.
Uso:  python scripts/produzione/audio_report.py [corsi...]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).parent))
from orchestratore import PROD, leggi_json, scrivi_atomico  # noqa: E402

CORSI = ["19011", "9001", "45001", "27001", "14001", "22000", "37001", "42001",
         "50001", "39001", "agg14001"]


def main() -> None:
    corsi = sys.argv[1:] or CORSI
    report = {"corsi": {}, "outlier": []}
    print(f"{'corso':>9} | {'legali':>6} | {'reali':>7} | margine | moduli")
    print("-" * 60)
    tutti_ok = True
    for c in corsi:
        cop = leggi_json(PROD / c / "copioni.json")
        legali = (cop.get("budget") or {}).get("minutiLegali")
        tot_s, mods = 0.0, {}
        for reg_p in sorted((PROD / c / "_log").glob("audio-m*.json")):
            reg = leggi_json(reg_p, {})
            mod = reg_p.stem.replace("audio-", "")
            mods[mod] = round(reg.get("totale_s", 0) / 60, 1)
            tot_s += reg.get("totale_s", 0)
            for sid, v in (reg.get("slide") or {}).items():
                if abs(v.get("delta_pct", 0)) > 20:
                    report["outlier"].append({"slide": sid, "delta_pct": v["delta_pct"],
                                              "durata_s": v["durata_s"]})
        reali = tot_s / 60
        ok = (legali is None) or (reali >= legali)
        tutti_ok &= ok
        margine = f"{(reali/legali-1)*100:+.1f}%" if legali else "n/a"
        print(f"{c:>9} | {legali or '—':>6} | {reali:>7.1f} | {margine:>7} "
              f"{'OK' if ok else '*** SOTTO ***'} | {len(mods)} moduli")
        report["corsi"][c] = {"minutiLegali": legali, "minutiReali": round(reali, 1),
                              "ok": ok, "moduli": mods}
    if report["outlier"]:
        print(f"\nslide fuori finestra stima (>±20%, da riascoltare): {len(report['outlier'])}")
        for o in report["outlier"][:15]:
            print(f"  {o['slide']}: {o['delta_pct']:+.1f}% ({o['durata_s']:.0f}s)")
    scrivi_atomico(PROD / "asset" / "audio-report.json",
                   json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nreport → produzione/asset/audio-report.json · "
          f"{'TUTTI I CORSI SOPRA I MINUTI LEGALI' if tutti_ok else 'ATTENZIONE: corsi sotto i legali'}")
    sys.exit(0 if tutti_ok else 1)


if __name__ == "__main__":
    main()
