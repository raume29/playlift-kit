#!/usr/bin/env python3
"""Hook Claude Code pour l'OS. Ne bloque jamais Claude : tout est en best effort, délai court.
- PostToolUse : Write d'un .html .htm .pdf .png .jpg .jpeg .svg .webp, Artifact publié (le fichier local),
  Bash dont la commande cite un fichier de ces types modifié dans les 2 dernières minutes → affiché en haut.
- SessionStart / SessionEnd : dit à l'OS quelle session Claude tourne dans quel terminal (reprise au redémarrage).
- PreToolUse / PostToolUse / UserPromptSubmit / Stop : le moniteur (ce que fait Claude, en direct) → POST /activite.
"""
import json, os, re, subprocess, sys, time, urllib.request
from pathlib import Path

EXT = {".html", ".htm", ".pdf", ".png", ".jpg", ".jpeg", ".svg", ".webp"}
VOIR = Path(__file__).resolve().parent / "voir"
VITRINE = "http://127.0.0.1:" + os.environ.get("VITRINE_PORT", "8799")
IGNORER = ("/private/tmp/", "/tmp/", "/var/folders/", "/.claude/")   # brouillons et captures de travail


def entetes():
    """Jeton de l'API (fichier 0600 posé par l'OS à son démarrage)."""
    h = {"Content-Type": "application/json"}
    try:
        h["X-Jeton"] = (Path(__file__).resolve().parent / (".jeton-" + os.environ.get("VITRINE_PORT", "8799"))).read_text().strip()
    except OSError:
        pass
    return h


def envoyer(cible, forcer=False, lien=None):
    if not forcer and any(x in cible for x in IGNORER):
        return
    # VITRINE_DISCRET : un livrable déposé par le hook ne relance pas l'OS fermée et ne la ramène pas au premier plan
    env = dict(os.environ, VITRINE_DISCRET="1", **({"VITRINE_LIEN": lien} if lien else {}))     # lien à copier (URL claude.ai d'un artefact)
    subprocess.Popen([str(VOIR), cible], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     start_new_session=True, env=env)


def lien_artefact(rep):
    """L'URL claude.ai de l'artefact publié, lue dans le retour de l'outil."""
    m = re.search(r"https://claude\.ai/(?:code/)?artifact/[\w-]+", json.dumps(rep) if not isinstance(rep, str) else rep)
    return m.group(0) if m else None


def ancetres():
    """Ce processus et ses parents (jusqu'au shell du terminal de l'OS), sans dépasser 12 niveaux."""
    pids, pid = [], os.getpid()
    for _ in range(12):
        pids.append(pid)
        try:
            r = subprocess.run(["ps", "-o", "ppid=", "-p", str(pid)], capture_output=True, text=True, timeout=1)
            pid = int(r.stdout.strip() or 0)
        except Exception:
            break
        if pid <= 1:
            break
    return pids


def session(d, evenement):
    if os.environ.get("VITRINE") != "1":       # pas lancé depuis un terminal de l'OS : rien à relier
        return
    corps = json.dumps({"session_id": d.get("session_id"), "pids": ancetres(), "evenement": evenement}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(VITRINE + "/session", corps, entetes()), timeout=1.5)
    except Exception:
        pass


def poster(chemin, corps, delai=0.8):
    try:
        urllib.request.urlopen(urllib.request.Request(VITRINE + chemin, json.dumps(corps).encode(), entetes()), timeout=delai)
    except Exception:
        pass


def resume_outil(outil, e):
    """Une ligne lisible + le détail utile, par outil."""
    g = lambda *ks: next((str(e.get(k)) for k in ks if e.get(k)), "")
    if outil == "Bash":
        return g("description") or g("command")[:160], {"commande": g("command")[:2000], "description": g("description")}
    if outil in ("Read", "Write", "Edit", "NotebookEdit"):
        f = g("file_path", "notebook_path")
        d = {"chemin": f}
        if outil == "Edit":
            d.update(avant=g("old_string")[:1500], apres=g("new_string")[:1500])
        if outil == "Write":
            d["contenu"] = g("content")[:2500]
        return f.replace(os.path.expanduser("~"), "~"), d
    if outil in ("Grep", "Glob"):
        return (g("pattern") + ("  ·  " + g("path").replace(os.path.expanduser("~"), "~") if e.get("path") else "")), {"motif": g("pattern"), "dossier": g("path")}
    if outil == "WebSearch":
        return g("query"), {"requete": g("query")}
    if outil == "WebFetch":
        return g("url"), {"url": g("url"), "prompt": g("prompt")[:300]}
    if outil == "Agent":
        return g("description") or g("prompt")[:120], {"type": g("subagent_type"), "prompt": g("prompt")[:1500]}
    if outil == "Skill":
        return "/" + g("skill") + (" " + g("args") if e.get("args") else ""), {"skill": g("skill"), "args": g("args")[:500]}
    if outil == "Artifact":
        return g("action") or "publish", {"fichier": g("file_path"), "url": g("url") if e.get("url", "").startswith("http") else ""}
    if outil.startswith("mcp__claude-in-chrome__"):
        d = {k: (v if isinstance(v, (int, float, bool)) else str(v)[:300]) for k, v in e.items()}
        return g("url", "action", "query", "text", "coordinate", "tabId")[:160], d
    # générique : premières valeurs texte
    d = {k: (v if isinstance(v, (int, float, bool)) else (json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else str(v))[:400]) for k, v in list(e.items())[:8]}
    return "  ".join(str(v)[:60] for v in list(e.values())[:3] if isinstance(v, (str, int, float))), d


def sortie_outil(rep):
    """Le retour d'un outil, aplati et coupé (le moniteur montre les premières lignes)."""
    if rep is None:
        return ""
    if isinstance(rep, dict):
        for k in ("stdout", "output", "content", "text", "result", "file"):
            v = rep.get(k)
            if isinstance(v, dict):
                v = v.get("content") or v.get("text")
            if isinstance(v, str) and v.strip():
                err = rep.get("stderr")
                return (v + ("\n" + str(err) if isinstance(err, str) and err.strip() else ""))[:3000]
        if rep.get("stderr"):
            return str(rep["stderr"])[:3000]
        return json.dumps(rep, ensure_ascii=False)[:3000]
    if isinstance(rep, list):
        return "\n".join(str(x.get("text") if isinstance(x, dict) else x) for x in rep)[:3000]
    return str(rep)[:3000]


def activite(d, ev):
    """Moniteur : chaque action de Claude, avant et après, plus les prompts et la fin de réponse."""
    if os.environ.get("VITRINE") != "1":
        return
    base = {"session_id": d.get("session_id"), "terminal": os.environ.get("VITRINE_TERMINAL")}
    outil = d.get("tool_name", "")
    if ev == "PreToolUse":
        r, det = resume_outil(outil, d.get("tool_input") or {})
        poster("/activite", dict(base, type="outil", id=d.get("tool_use_id"), outil=outil, resume=r, detail=det))
    elif ev == "PostToolUse":
        rep = d.get("tool_response")
        err = isinstance(rep, dict) and bool(rep.get("is_error") or rep.get("error"))
        poster("/activite", dict(base, type="fin", id=d.get("tool_use_id"), outil=outil, sortie=sortie_outil(rep), erreur=err))
    elif ev == "UserPromptSubmit":
        poster("/activite", dict(base, type="prompt", texte=str(d.get("prompt") or "")[:600]))
    elif ev == "Stop":
        poster("/activite", dict(base, type="stop"))


def livrable(d):
    outil = d.get("tool_name", "")
    entree = d.get("tool_input") or {}
    cibles = []
    if outil == "Write":   # pas Edit : une retouche de template n'est pas un livrable
        f = entree.get("file_path", "")
        if Path(f).suffix.lower() in EXT and os.path.exists(f) and not re.search(r"/(templates|static|node_modules)/", f):
            cibles.append(f)
    elif outil == "Artifact":
        # un artefact publié est un livrable fini, même écrit dans le scratchpad (22/09/2026)
        f = entree.get("file_path", "")
        if entree.get("action", "publish") == "publish" and not entree.get("asset") and f and os.path.exists(f):
            envoyer(f, forcer=True, lien=entree.get("url") or lien_artefact(d.get("tool_response")))
        return
    elif outil == "Bash":
        cmd = entree.get("command", "")
        maintenant = time.time()
        vus = set()
        for m in re.finditer(r"[\w./~\-À-ſ ]+?\.(?:html|htm|pdf|png|jpg|jpeg|svg|webp)\b", cmd):
            for cand in (m.group(0).strip(), m.group(0).strip().split()[-1]):
                p = Path(os.path.expanduser(cand))
                if not p.is_absolute():
                    p = Path(d.get("cwd") or os.getcwd()) / p
                try:
                    if p.is_file() and maintenant - p.stat().st_mtime < 120 and str(p) not in vus:
                        vus.add(str(p))
                        cibles.append(str(p))
                        break
                except OSError:
                    pass
    for c in cibles[-1:]:   # le dernier seulement
        envoyer(c)


def main():
    try:
        d = json.load(sys.stdin)
    except Exception:
        return
    if not isinstance(d, dict):
        return
    ev = d.get("hook_event_name", "")
    if ev in ("SessionStart", "SessionEnd"):
        session(d, ev)
        return
    activite(d, ev)
    if ev == "PostToolUse" or (not ev and d.get("tool_name")):
        livrable(d)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
