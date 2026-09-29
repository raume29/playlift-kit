#!/usr/bin/env python3
"""Infographie animée pour LinkedIn : un point parcourt tes étapes, chacune s'allume à son passage.
Sort un GIF qui boucle (à poster comme une PHOTO) et un MP4 de secours.

    python3 gif/gif.py gif/exemple.json          → exemple.gif, exemple.mp4, exemple-fixe.png à côté du .json

Une spec (JSON), voir gif/exemple.json :
    titre      ton titre, [[ ]] autour du mot à surligner (un seul)
    etiquette  en haut à droite (facultatif)
    marque     en haut à gauche, ton nom ou ta marque
    etapes     4, 6 ou 8 étapes : [titre court, une phrase]
    cta        facultatif : « Commente [[MOT]] » en bas
    sous_cta   facultatif : la ligne sous le cta
    pied       facultatif si pas de cta : « Prénom Nom · site »
    charte     {"fond", "texte", "accent", "police"}  police = une police Google Fonts
    duree      secondes de la boucle (8 par défaut)

Dépendances : pip install playwright && python3 -m playwright install chromium ; ffmpeg installé.
Rendu déterministe : la page expose render(t), on la photographie image par image.
"""
import html as _h
import json
import os
import shutil
import subprocess
import sys
import tempfile

from playwright.sync_api import sync_playwright

W, H, FPS = 1080, 1350, 15
LG = W - 2 * 80            # largeur de la zone du parcours
NX = [LG // 4 + 20, LG * 3 // 4 - 20]  # centres des deux colonnes
PAS, CARTE = 186, 130      # écart entre rangées, hauteur d'une carte


def chemin(ry):
    """Le tracé en serpentin : rangée paire de gauche à droite, impaire de droite à gauche."""
    d, r = f"M 40 {ry[0]}", 18
    for i in range(len(ry) - 1):
        a, b = ry[i], ry[i + 1]
        if i % 2 == 0:
            d += f" H {LG - 40} Q {LG} {a} {LG} {a + 40} V {b - 40} Q {LG} {b} {LG - 40} {b}"
        else:
            d += f" H 40 Q 0 {a} 0 {a + 40} V {b - 40} Q 0 {b} 40 {b}"
    fin = NX[1] if (len(ry) - 1) % 2 == 0 else NX[0]
    return d + f" H {fin}"


def page(s):
    c = {"fond": "#111114", "texte": "#F3F3F0", "accent": "#FF4A1C", "police": "Inter", **s.get("charte", {})}
    n = len(s["etapes"])
    pas = PAS if n >= 6 else 250
    ry = [26 + i * pas for i in range(n // 2)]
    haut = ry[-1] + 34 + CARTE + 10

    def txt(v):
        return _h.escape(v).replace("[[", '<span class="hl">').replace("]]", "</span>")

    cartes = []
    for i, (ti, so) in enumerate(s["etapes"]):
        r = i // 2
        col = i % 2 if r % 2 == 0 else 1 - i % 2
        x, y = NX[col], ry[r]
        cartes.append(f'<div class="carte" id="c{i}" style="left:{x - 165}px;top:{y + 34}px"><b>{txt(ti)}</b>'
                      f'<span>{txt(so)}</span></div><div class="noeud" id="n{i}" style="left:{x - 23}px;top:{y - 23}px">{i + 1}</div>')
    bas = (f'<div class="cta">{txt(s["cta"])}<small>{txt(s.get("sous_cta", ""))}</small></div>' if s.get("cta")
           else f'<div class="pied">{txt(s.get("pied", ""))}</div>')
    police = c["police"].replace(" ", "+")
    duree = float(s.get("duree", 8))
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family={police}:wght@700;800&display=block" rel="stylesheet"><style>
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
body{{font-family:"{c["police"]}",Arial,sans-serif;-webkit-font-smoothing:antialiased;background:{c["fond"]};color:{c["texte"]};
  padding:80px 80px 70px;display:flex;flex-direction:column;gap:30px}}
.tete{{display:flex;justify-content:space-between;align-items:center;font-weight:800}}
.marque{{font-size:40px;letter-spacing:-.03em}}
.num{{font-size:24px;font-weight:700;text-transform:uppercase;opacity:.85}}
h1{{font-weight:800;font-size:{s.get("taille_titre", 72)}px;line-height:1.08;letter-spacing:-.03em;margin-top:18px}}
.hl{{background:{c["accent"]};color:{c["fond"]};padding:.02em .2em .08em;-webkit-box-decoration-break:clone;line-height:1.22}}
.parcours{{position:relative;width:{LG}px;height:{haut}px;margin:auto 0}}
svg{{position:absolute;inset:0;overflow:visible}}
.carte{{position:absolute;width:330px;height:{CARTE}px;border:3px solid color-mix(in srgb,{c["texte"]} 20%,transparent);
  padding:18px 20px;display:flex;flex-direction:column;gap:8px}}
.carte b{{font-size:31px;letter-spacing:-.025em;line-height:1.05}}
.carte span{{font-size:22px;font-weight:700;line-height:1.25;opacity:.62}}
.carte.on{{border-color:{c["accent"]}}}
.noeud{{position:absolute;width:46px;height:46px;border-radius:50%;background:{c["fond"]};
  border:3px solid color-mix(in srgb,{c["texte"]} 35%,transparent);display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:800;color:color-mix(in srgb,{c["texte"]} 60%,transparent)}}
.noeud.on{{background:{c["accent"]};border-color:{c["accent"]};color:{c["fond"]}}}
#point{{position:absolute;width:22px;height:22px;border-radius:50%;background:{c["accent"]};margin:-11px 0 0 -11px;
  box-shadow:0 0 0 7px color-mix(in srgb,{c["accent"]} 28%,transparent)}}
.cta{{font-weight:800;font-size:66px;letter-spacing:-.03em;line-height:1.1}}
.cta small{{display:block;font-size:26px;font-weight:700;letter-spacing:0;margin-top:14px}}
.pied{{border-top:3px solid {c["texte"]};padding-top:20px;font-weight:800;font-size:28px}}
</style></head><body>
<div class="tete"><span class="marque">{txt(s.get("marque", ""))}</span><span class="num">{txt(s.get("etiquette", ""))}</span></div>
<h1>{txt(s["titre"])}</h1>
<div class="parcours"><svg viewBox="0 0 {LG} {haut}" width="{LG}" height="{haut}">
<path d="{chemin(ry)}" fill="none" stroke="color-mix(in srgb,{c["texte"]} 18%,transparent)" stroke-width="4"/>
<path id="fil" d="{chemin(ry)}" fill="none" stroke="{c["accent"]}" stroke-width="4"/></svg>
{"".join(cartes)}<div id="point"></div></div>
{bas}
<script>
const D = {duree}, fil = document.getElementById('fil'), L = fil.getTotalLength(), point = document.getElementById('point');
fil.style.strokeDasharray = L;
const noeuds = [...document.querySelectorAll('.noeud')].map(n => {{
  const x = n.offsetLeft + 23, y = n.offsetTop + 23; let best = 0, d = 1e9;
  for (let l = 0; l <= L; l += 2) {{ const p = fil.getPointAtLength(l), e = (p.x-x)**2 + (p.y-y)**2; if (e < d) {{ d = e; best = l; }} }}
  return best; }});
const ease = u => u < .5 ? 2*u*u : 1 - (-2*u + 2)**2 / 2;
// 5 % de repos, 70 % de trajet, le reste tout allumé, puis extinction sur les 7,5 % de fin
window.render = t => {{
  const u = Math.min(1, Math.max(0, (t - .05*D) / (.7*D))), l = L * ease(u), off = t > .925*D ? (t - .925*D) / (.075*D) : 0;
  fil.style.strokeDashoffset = L - l; fil.style.opacity = 1 - off; point.style.opacity = u >= 1 ? 0 : 1;
  const p = fil.getPointAtLength(l); point.style.left = p.x + 'px'; point.style.top = p.y + 'px';
  noeuds.forEach((nl, i) => {{ const on = l >= nl - 1 && off < .5;
    document.getElementById('n' + i).classList.toggle('on', on); document.getElementById('c' + i).classList.toggle('on', on); }});
}};
render(0);
</script></body></html>"""


def verifier(s):
    fautes = []
    if len(s.get("etapes", [])) not in (4, 6, 8):
        fautes.append("4, 6 ou 8 étapes")
    if (s.get("titre", "") + s.get("cta", "")).count("[[") > 1:
        fautes.append("un seul surlignage, titre et cta compris")
    return fautes


def main(f):
    s = json.load(open(f, encoding="utf-8"))
    fautes = verifier(s)
    if fautes:
        sys.exit("✕ " + " · ".join(fautes))
    if not shutil.which("ffmpeg"):
        sys.exit("✕ ffmpeg introuvable (macOS : brew install ffmpeg)")
    dossier, nom = os.path.dirname(os.path.abspath(f)), os.path.splitext(os.path.basename(f))[0]
    tmp = tempfile.mkdtemp()
    src = os.path.join(tmp, "page.html")
    open(src, "w", encoding="utf-8").write(page(s))
    duree = float(s.get("duree", 8))
    n = int(FPS * duree)
    with sync_playwright() as p:
        nav = p.chromium.launch()
        pg = nav.new_page(viewport={"width": W, "height": H})
        pg.goto("file://" + src, wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        for i in range(n):
            pg.evaluate(f"render({i / FPS})")
            pg.screenshot(path=os.path.join(tmp, f"f{i:04d}.png"))
        nav.close()
    shutil.copy(os.path.join(tmp, f"f{int(n * .82):04d}.png"), os.path.join(dossier, f"{nom}-fixe.png"))
    motif = os.path.join(tmp, "f%04d.png")
    gif, mp4 = os.path.join(dossier, f"{nom}.gif"), os.path.join(dossier, f"{nom}.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", motif, "-vf",
                    "split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];"
                    "[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", gif], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", motif, "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", "-crf", "18", mp4], check=True)
    shutil.rmtree(tmp)
    print(f"✓ {gif} ({os.path.getsize(gif) / 1e6:.1f} Mo)\n✓ {mp4}\n✓ {os.path.join(dossier, nom + '-fixe.png')}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "exemple.json"))
