# Converte le 11 cover PNG (covercorsi/) in WebP ottimizzati (public/covers/<iso>.webp).
# Mantiene 1586x992 (16:10). Mapping file->nome uscita (attenzione al typo 42011->42001).
from PIL import Image
import os

MAP = {
    "9001cover.png": "9001",
    "14001cover.png": "14001",
    "14001aggcover.png": "agg14001",
    "19011cover.png": "19011",
    "22000cover.png": "22000",
    "27001cover.png": "27001",
    "37001cover.png": "37001",
    "39001cover.png": "39001",
    "42011cover.png": "42001",  # typo nel nome file: il corso è ISO 42001 (contenuto = IA)
    "45001cover.png": "45001",
    "50001cover.png": "50001",
    "fadai01cover.png": "fadai01",  # Claude AI Operativo (tema ambra)
    "fadai02cover.png": "fadai02",  # Claude AI Avanzato (tema navy)
}

os.makedirs("public/covers", exist_ok=True)
for src, iso in MAP.items():
    p = os.path.join("covercorsi", src)
    if not os.path.exists(p):
        print(f"MANCANTE: {p}"); continue
    im = Image.open(p).convert("RGB")
    out = os.path.join("public/covers", f"{iso}.webp")
    im.save(out, "WEBP", quality=82, method=6)
    kb = os.path.getsize(out) // 1024
    print(f"{src:22} -> covers/{iso}.webp  {im.size[0]}x{im.size[1]}  {kb}KB")
print("FATTO.")
