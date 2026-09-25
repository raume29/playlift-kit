#!/usr/bin/env python3
"""Règle Claude Code comme dans les captures d'OS KADANS : barre d'état 2 lignes (contexte, coût,
quotas 5 h et 7 j avec rythme), thème Cybernet, plein écran, style de réponse concis, raccourcis.

    python configurer.py            # applique (copie de l'ancien settings.json gardée)
    python configurer.py retirer    # enlève ces réglages, remet le thème et la barre par défaut

Ne touche à rien d'autre dans ~/.claude/settings.json (permissions, hooks, modèle, plugins).
"""
import json, shutil, sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
CLAUDE = Path.home() / ".claude"
SETTINGS = CLAUDE / "settings.json"
BARRE = CLAUDE / "statusline-os-kadans.sh"
THEME = CLAUDE / "themes" / "cybernet.json"
TOUCHES = CLAUDE / "keybindings.json"

REGLAGES = {
    "statusLine": {"type": "command", "command": f"bash '{BARRE}'", "padding": 0, "refreshInterval": 10},
    "theme": "custom:cybernet",
    "tui": "fullscreen",
    "outputStyle": "Concise",
}
RACCOURCIS = [
    {"context": "Chat", "bindings": {"alt+enter": "chat:newline", "ctrl+k ctrl+n": "chat:killAgents"}},
    {"context": "Global", "bindings": {"ctrl+k ctrl+t": "app:toggleTodos", "ctrl+k ctrl+s": "app:globalSearch"}},
]


def lire(p, defaut):
    try:
        return json.loads(p.read_text() or "null") or defaut
    except FileNotFoundError:
        return defaut
    except json.JSONDecodeError:
        sys.exit(f"❌ {p} n'est pas un JSON valide : corrige-le d'abord, rien n'a été touché.")


def appliquer():
    CLAUDE.mkdir(exist_ok=True)
    (CLAUDE / "themes").mkdir(exist_ok=True)
    shutil.copy2(ICI / "statusline.sh", BARRE)
    shutil.copy2(ICI / "cybernet.json", THEME)
    s = lire(SETTINGS, {})
    if SETTINGS.exists():
        shutil.copy2(SETTINGS, SETTINGS.with_name("settings.json.avant-os-kadans-config"))
    s.update(REGLAGES)
    SETTINGS.write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n")
    k = lire(TOUCHES, {"$schema": "https://www.schemastore.org/claude-code-keybindings.json", "bindings": []})
    for bloc in RACCOURCIS:          # ajoute sans écraser un raccourci déjà choisi
        cible = next((b for b in k["bindings"] if b.get("context") == bloc["context"]), None)
        if cible is None:
            k["bindings"].append(json.loads(json.dumps(bloc)))
        else:
            for t, a in bloc["bindings"].items():
                cible["bindings"].setdefault(t, a)
    TOUCHES.write_text(json.dumps(k, indent=2, ensure_ascii=False) + "\n")
    print("✅ Claude Code réglé : barre d'état, thème Cybernet, plein écran, style concis, raccourcis.")
    print("   Ouvre un nouveau chat pour voir le résultat.")


def retirer():
    s = lire(SETTINGS, {})
    for cle, val in REGLAGES.items():
        if s.get(cle) == val:
            s.pop(cle)
    SETTINGS.write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n")
    print("✅ réglages OS KADANS retirés de settings.json (thème et barre par défaut).")


if __name__ == "__main__":
    {"": appliquer, "retirer": retirer}.get((sys.argv[1:] or [""])[0], lambda: sys.exit(__doc__))()
