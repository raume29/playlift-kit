#!/usr/bin/env python3
"""Mises à jour d'OS KADANS, depuis kits.playlift.ai (ou par git pour une installation clonée).

    python maj.py              # voir maj : installe tout de suite la dernière version, puis relance l'OS
    python maj.py --lancement  # à l'ouverture de l'app : vérifie en 4 s max, installe s'il y a du neuf, jamais bloquant
    python maj.py --veille     # tant que l'OS est ouvert : vérifie toutes les 6 h, notifie une fois par version
    python maj.py --version    # la version installée

Seuls les fichiers du kit sont remplacés : .venv, jarvis.env, modeles/, jetons, chats et livrables restent.
Le zip est vérifié (sha256 publié dans version.json) avant qu'un seul fichier soit touché.
"""
import fcntl
import hashlib
import io
import json
import os
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

ICI = Path(__file__).resolve().parent
URL = os.environ.get("OS_KADANS_MAJ_URL", "https://kits.playlift.ai/os/version.json")
PORT = os.environ.get("VITRINE_PORT", "8799")
PY = ICI / ".venv" / "bin" / "python"
JOURNAL = ICI / "maj.log"
# jamais touchés, même si un zip les contenait
GARDES = {".venv", "modeles", "depots", "profil", "transcripts", "jarvis.env", "etat.json", "sessions.json", ".env",
          ".app-chemin", "os.log", "maj.log", "jarvis_local.log", ".git"}
TAILLE_MAX = 50 * 1024 * 1024


def log(*m):
    ligne = time.strftime("%Y-%m-%d %H:%M:%S ") + " ".join(str(x) for x in m)
    print(ligne)
    try:
        with open(JOURNAL, "a", encoding="utf-8") as f:
            f.write(ligne + "\n")
    except OSError:
        pass


def version_locale():
    try:
        return int((ICI / "VERSION").read_text().strip())
    except (OSError, ValueError):
        return 0


def lire_url(url, delai, limite=TAILLE_MAX):
    req = urllib.request.Request(url, headers={"User-Agent": f"OsKadans/{version_locale()}", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=delai) as r:
        data = r.read(limite + 1)
    if len(data) > limite:
        raise ValueError("réponse trop grosse")
    return data


def derniere(delai):
    info = json.loads(lire_url(f"{URL}?t={int(time.time())}", delai, 64 * 1024))
    if not isinstance(info.get("version"), int) or not str(info.get("zip", "")).startswith(("https://", "http://127.0.0.1:")) or len(info.get("sha256", "")) != 64:
        raise ValueError(f"version.json inattendu : {info}")
    return info


def os_ouverte():
    try:
        jeton = (ICI / f".jeton-{PORT}").read_text().strip()
        req = urllib.request.Request(f"http://127.0.0.1:{PORT}/etat", headers={"X-Jeton": jeton})
        urllib.request.urlopen(req, timeout=1).read()
        return True
    except Exception:
        return False


def relancer_os():
    try:
        jeton = (ICI / f".jeton-{PORT}").read_text().strip()
        req = urllib.request.Request(f"http://127.0.0.1:{PORT}/redemarrer", headers={"X-Jeton": jeton})
        urllib.request.urlopen(req, timeout=3).read()
        return True
    except Exception:
        return False


def changes_zip(data):
    """Fichiers du zip qui diffèrent de ceux en place : {chemin relatif: (contenu, mode)}. Refuse tout chemin douteux."""
    out = {}
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for m in z.infolist():
            if m.is_dir():
                continue
            if not m.filename.startswith("os/"):
                raise ValueError(f"fichier hors du kit dans le zip : {m.filename}")
            rel = Path(m.filename[3:])
            if rel.is_absolute() or ".." in rel.parts or not rel.parts:
                raise ValueError(f"chemin refusé : {m.filename}")
            if rel.parts[0] in GARDES or rel.name.startswith(".jeton-"):
                continue
            contenu = z.read(m)
            cible = ICI / rel
            if cible.exists() and cible.read_bytes() == contenu:
                continue
            mode = (m.external_attr >> 16) & 0o777 or 0o644
            out[str(rel)] = (contenu, mode)
    return out


def poser(changes):
    for rel, (contenu, mode) in changes.items():
        cible = ICI / rel
        cible.parent.mkdir(parents=True, exist_ok=True)
        tmp = cible.with_name(cible.name + ".maj-tmp")
        tmp.write_bytes(contenu)
        os.chmod(tmp, mode)
        os.replace(tmp, cible)


def par_git():
    """Installation clonée (git clone) : on tire la branche, sans rien écraser à la main. Renvoie les fichiers changés."""
    racine = ICI.parent
    avant = subprocess.run(["git", "-C", racine, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    r = subprocess.run(["git", "-C", racine, "pull", "--ff-only", "-q"], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(f"git pull refusé (modifs locales ?) : {r.stderr.strip()[:200]}")
    diff = subprocess.run(["git", "-C", racine, "diff", "--name-only", avant, "HEAD", "--", "os/"], capture_output=True, text=True).stdout
    return [l[3:] for l in diff.split() if l.startswith("os/")]


def apres(fichiers):
    """Ce que l'installeur ferait pour les fichiers qui ont bougé : dépendances, app, hooks."""
    f = set(fichiers)
    if "install.sh" in f:
        # l'installeur a changé : il refait dépendances, app, commande voir et hooks (sans question, sans ouvrir l'app)
        subprocess.run(["bash", ICI / "install.sh", "--maj"], cwd=ICI, timeout=600)
        return
    if "requirements.txt" in f:
        subprocess.run([PY, "-m", "pip", "install", "-q", "-r", ICI / "requirements.txt"], timeout=600)
    if "requirements-jarvis.txt" in f and (ICI / "modeles").exists():
        subprocess.run([PY, "-m", "pip", "install", "-q", "-r", ICI / "requirements-jarvis.txt"], timeout=900)
    if "hooks.py" in f:
        subprocess.run([PY, ICI / "hooks.py", "installer"], timeout=60)


def mettre_a_jour(lancement=False):
    avant = version_locale()
    info = derniere(4 if lancement else 15)
    if info["version"] <= avant:
        if not lancement:
            print(f"OS KADANS est à jour (v{avant}).")
        return False
    log(f"v{avant} → v{info['version']}")
    if (ICI.parent / ".git").exists():
        fichiers = par_git()
    else:
        data = lire_url(info["zip"], 30 if lancement else 120)
        if hashlib.sha256(data).hexdigest() != info["sha256"]:
            raise ValueError("zip corrompu ou modifié : sha256 différent, rien n'a été touché")
        changes = changes_zip(data)
        poser(changes)
        fichiers = list(changes)
    log(f"{len(fichiers)} fichier(s) remplacé(s) :", ", ".join(sorted(fichiers))[:500])
    apres(fichiers)
    log(f"✅ OS KADANS v{version_locale()} installée")
    if info.get("notes") and not lancement:
        print("   " + info["notes"])
    return True


def notifier(texte):
    t = texte.replace('"', "'")
    subprocess.run(["osascript", "-e", f'display notification "{t}" with title "OS KADANS"'], timeout=10)


def veille():
    """Lancée par l'app : une notification par nouvelle version, jamais d'installation pendant que tu travailles."""
    time.sleep(120)
    deja = 0
    while os_ouverte():
        try:
            info = derniere(15)
            if info["version"] > version_locale() and info["version"] != deja:
                deja = info["version"]
                notifier(f"Version {deja} prête. Relance l'OS ou tape « voir maj » : tes chats reprennent où ils étaient.")
        except Exception as e:
            log("veille :", e)
        for _ in range(6 * 60):
            time.sleep(60)
            if not os_ouverte():
                return


def main():
    arg = (sys.argv[1:] or [""])[0]
    if arg == "--version":
        print(f"OS KADANS v{version_locale()}")
        return
    if arg == "--veille":
        seule = open(ICI / ".veille.lock", "w")            # une seule veille, même après plusieurs ouvertures
        try:
            fcntl.flock(seule, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        veille()
        return
    lancement = arg == "--lancement"
    verrou = open(ICI / ".maj.lock", "w")
    try:
        fcntl.flock(verrou, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("Une mise à jour est déjà en cours.")
        return
    try:
        fait = mettre_a_jour(lancement)
    except Exception as e:
        log("❌ mise à jour impossible :", e)
        if not lancement:
            sys.exit(1)
        return
    if fait and not lancement:
        if relancer_os():
            print("OS KADANS redémarre, tes chats reprennent dans leurs onglets.")
        else:
            print("Ouvre OS KADANS : la nouvelle version est en place.")


if __name__ == "__main__":
    main()
