# Test composizione logo su UNA cover. Ritaglia il lockup ai pixel non trasparenti, lo scala
# e lo incolla in alto a destra (zona crema libera). Salva un PNG di anteprima.
from PIL import Image

COVER = "covercorsi/42011cover.png"   # cover IA (42001)
LOGO = "logosvg/brand-logo-lockup-for--evalis-academy---keep-the-a (1).png"
OUT = "produzione/_email-preview/_logo-test-topright.png"

cover = Image.open(COVER).convert("RGBA")
W, H = cover.size

logo = Image.open(LOGO).convert("RGBA")
bbox = logo.getbbox()          # ritaglia il padding trasparente
logo = logo.crop(bbox)
lw, lh = logo.size

target_w = int(W * 0.16)       # 16% della larghezza cover
scale = target_w / lw
logo = logo.resize((target_w, int(lh * scale)), Image.LANCZOS)

pad = int(W * 0.035)
pos = (W - logo.size[0] - pad, pad)   # alto-destra
cover.alpha_composite(logo, pos)
cover.convert("RGB").save(OUT, "PNG")
print(f"salvato {OUT}  (logo {logo.size[0]}x{logo.size[1]} in alto-destra)")
