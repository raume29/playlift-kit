"""Agent de qualification : il note chaque lead entrant avant qu'il ne prenne un créneau.

Le formulaire (`index.html`) se met devant ton calendrier. À chaque soumission, l'agent
lit les réponses, décide si ça vaut un appel, et t'envoie le verdict sur Telegram — avant
que tu ne découvres le prospect en direct, à la 35e minute.

Le tri ne se fait pas sur le budget déclaré (tout le monde ment sur le budget) mais sur
quatre choses ensemble : le problème est-il celui que tu règles, l'a-t-il déjà chiffré,
peut-il décider seul, et qu'est-ce qui l'empêche d'attendre six mois.

Sert aussi le formulaire : un seul service, une seule URL, rien à héberger ailleurs.
"""
import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import anthropic

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
# Opus par défaut : c'est un jugement à rendre sur des signaux faibles, pas une
# classification mécanique. MODEL=claude-sonnet-5 pour réduire le coût.
MODEL = os.environ.get("MODEL", "claude-opus-5")
PORT = int(os.environ.get("PORT", "8000"))
# Ce que tu vends, en une phrase : sans ça l'agent ne peut pas juger si un lead est le tien.
OFFRE = os.environ.get("OFFRE", "un accompagnement high-ticket pour fondateurs")
# L'URL de ton calendrier : le formulaire y renvoie quand le lead est retenu.
CALENDRIER = os.environ.get("CALENDRIER", "")

ICI = os.path.dirname(os.path.abspath(__file__))

PROMPT = """Tu qualifies un lead entrant pour quelqu'un qui vend : {offre}

Voici ses réponses au formulaire :
{reponses}

Juge sur QUATRE critères, ensemble — jamais sur le budget seul, tout le monde ment sur le
budget :
1. PROBLÈME — décrit-il le problème que cette offre règle, ou un autre ?
2. CHIFFRE — a-t-il déjà mesuré ce que ce problème lui coûte ? Quelqu'un qui a chiffré son
   problème l'a déjà accepté comme un coût, donc il peut payer pour le régler.
3. DÉCISION — peut-il décider seul, et sous quel délai ?
4. URGENCE — qu'est-ce qui l'empêche d'attendre six mois ? Sans réponse à ça, il attendra
   six mois.

Sois sévère. Un appel pris pour rien coûte une heure et le moral ; un appel refusé à tort
coûte un email de plus. Dans le doute, classe en TIÈDE, jamais en CHAUD.

Rends ton verdict, la question à poser avant de bloquer un créneau, et le message à
envoyer si on décline (3 lignes, sans mépris)."""

# Le format est imposé par l'API (structured outputs) plutôt que demandé dans le prompt :
# une consigne « réponds en JSON » se respecte presque toujours, presque n'est pas assez
# quand le verdict arrive pendant que le prospect attend sur la page.
SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["CHAUD", "TIEDE", "FROID"]},
        "score": {"type": "integer"},
        "resume": {"type": "string"},
        "pour": {"type": "array", "items": {"type": "string"}},
        "contre": {"type": "array", "items": {"type": "string"}},
        "question_manquante": {"type": "string"},
        "reponse_si_froid": {"type": "string"},
    },
    "required": ["verdict", "score", "resume", "pour", "contre",
                 "question_manquante", "reponse_si_froid"],
    "additionalProperties": False,
}


def qualifier(reponses):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    lignes = "\n".join(f"- {k} : {v}" for k, v in reponses.items() if v)
    # max_tokens plafonne la RÉFLEXION AUTANT QUE LA RÉPONSE sur les modèles actuels :
    # un budget serré laisse la réflexion tout manger et renvoie un JSON coupé en deux.
    # 4000 pour un verdict de 15 lignes, c'est de la marge assumée, pas du gaspillage —
    # seuls les tokens réellement produits sont facturés.
    msg = client.messages.create(
        model=MODEL, max_tokens=4000,
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
        messages=[{"role": "user", "content": PROMPT.format(offre=OFFRE, reponses=lignes)}])
    if msg.stop_reason == "max_tokens":
        raise RuntimeError("réponse tronquée : augmente max_tokens")
    return json.loads(next(b.text for b in msg.content if b.type == "text"))


def prevenir(verdict, reponses):
    """Envoie le verdict sur Telegram. Un échec d'envoi ne doit jamais perdre le lead."""
    if not (TELEGRAM_TOKEN and TELEGRAM_CHAT_ID):
        print("[qualif]", json.dumps(verdict, ensure_ascii=False))
        return
    icone = {"CHAUD": "🔥", "TIEDE": "🌤", "FROID": "❄️"}.get(verdict["verdict"], "•")
    texte = (
        f"{icone} <b>{verdict['verdict']}</b> · {verdict['score']}/100\n"
        f"{verdict['resume']}\n\n"
        "<b>Pour</b>\n" + "\n".join(f"• {p}" for p in verdict.get("pour", [])) + "\n\n"
        "<b>Contre</b>\n" + "\n".join(f"• {c}" for c in verdict.get("contre", [])) + "\n\n"
        f"<b>À demander avant de bloquer un créneau</b>\n{verdict['question_manquante']}\n\n"
        + "\n".join(f"<i>{k}</i> : {v}" for k, v in reponses.items() if v))
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": texte[:4000],
                       "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage", data=data,
        headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
    except Exception as e:
        print(f"[qualif] Telegram : {e}")


class Handler(BaseHTTPRequestHandler):
    def _repondre(self, code, corps, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(corps if isinstance(corps, bytes) else corps.encode())

    def do_GET(self):
        if self.path.startswith("/sante"):
            return self._repondre(200, '{"ok":true}')
        with open(os.path.join(ICI, "index.html"), encoding="utf-8") as f:
            page = f.read().replace("{{CALENDRIER}}", CALENDRIER)
        self._repondre(200, page, "text/html; charset=utf-8")

    def do_OPTIONS(self):
        self._repondre(204, b"")

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            reponses = json.loads(self.rfile.read(n) or "{}")
            verdict = qualifier(reponses)
            prevenir(verdict, reponses)
            # Le formulaire n'apprend jamais son score : afficher « FROID » à un lead le
            # braque, et un tiède peut devenir un client dans trois mois.
            self._repondre(200, json.dumps({"ok": True,
                                            "retenu": verdict["verdict"] != "FROID"}))
        except Exception as e:
            print(f"[qualif] {e}")
            # on ne perd jamais un lead sur une erreur : il passe, et c'est à toi de trier
            self._repondre(200, json.dumps({"ok": True, "retenu": True}))

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"[qualif] en écoute sur :{PORT}")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
