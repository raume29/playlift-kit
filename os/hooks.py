#!/usr/bin/env python3
"""Branche (ou débranche) OS KADANS sur Claude Code : six hooks dans ~/.claude/settings.json.

    python hooks.py installer      # ajoute les hooks, garde une copie settings.json.avant-os-kadans
    python hooks.py retirer        # enlève seulement les hooks de OS KADANS

Les hooks ne font rien hors d'un terminal OS KADANS (variable VITRINE=1), sauf pousser un livrable
fini dans la fenêtre si elle est ouverte. Ils ne bloquent jamais Claude : délai de 5 s, erreurs avalées.
"""
import json, shutil, sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
SETTINGS = Path.home() / ".claude" / "settings.json"
EVENEMENTS = ("PreToolUse", "PostToolUse", "UserPromptSubmit", "Stop", "SessionStart", "SessionEnd")
MARQUE = str(ICI / "hook.py")
COMMANDE = f"'{ICI / '.venv' / 'bin' / 'python'}' '{MARQUE}'"


def lire():
    if not SETTINGS.exists():
        return {}
    try:
        return json.loads(SETTINGS.read_text() or "{}")
    except json.JSONDecodeError:
        sys.exit(f"❌ {SETTINGS} n'est pas un JSON valide : corrige-le d'abord, rien n'a été touché.")


def a_nous(c):
    return MARQUE in c or ("playlift" in c.lower() and "hook.py" in c)


def nettoyer(d):
    """Retire toute entrée qui appelle ce hook.py (ou un ancien emplacement du kit)."""
    hooks = d.get("hooks") or {}
    for ev in list(hooks):
        groupes = []
        for g in hooks[ev] or []:
            g["hooks"] = [h for h in g.get("hooks", []) if not a_nous(h.get("command", ""))]
            if g["hooks"]:
                groupes.append(g)
        if groupes:
            hooks[ev] = groupes
        else:
            hooks.pop(ev)
    if hooks:
        d["hooks"] = hooks
    else:
        d.pop("hooks", None)
    return d


def ecrire(d):
    SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")


def installer():
    d = lire()
    if SETTINGS.exists():
        shutil.copy2(SETTINGS, SETTINGS.with_name("settings.json.avant-os-kadans"))
    d = nettoyer(d)
    hooks = d.setdefault("hooks", {})
    for ev in EVENEMENTS:
        hooks.setdefault(ev, []).append({"hooks": [{"type": "command", "command": COMMANDE, "timeout": 5}]})
    ecrire(d)
    print(f"✅ 6 hooks posés dans {SETTINGS}")


def retirer():
    ecrire(nettoyer(lire()))
    print(f"✅ hooks de OS KADANS retirés de {SETTINGS}")


if __name__ == "__main__":
    {"installer": installer, "retirer": retirer}.get((sys.argv[1:] or [""])[0], lambda: sys.exit(__doc__))()
