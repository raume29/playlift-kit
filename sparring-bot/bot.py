"""Bot Telegram d'entraînement au closing : Claude joue le prospect, toi tu vends.

Un fondateur qui vend lui-même passe deux à cinq appels par semaine. C'est trop peu pour
progresser : chaque erreur coûte un vrai prospect, et on ne la refait qu'une semaine plus
tard, sur quelqu'un d'autre. Ici, on rejoue le même moment dix fois de suite.

Le bot tient la conversation en mémoire (sur disque), garde le prospect dans son rôle, et
sort du personnage seulement sur /debrief pour donner une note et le moment exact où la
vente a été perdue.

Lancement : `python bot.py` — voir le README pour les deux variables d'environnement.
"""
import json
import os
import time
import traceback

import anthropic
import requests

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
# MODEL=claude-sonnet-5 pour réduire le coût : jouer un prospect demande de la tenue de
# rôle, pas du raisonnement lourd. Opus par défaut quand même — c'est lui qui sait sortir
# la vraie objection au bon moment plutôt qu'une objection de manuel.
MODEL = os.environ.get("MODEL", "claude-opus-5")
DATA_DIR = os.environ.get("DATA_DIR", ".")
# Une session = un chat. Persistée sur disque : un redémarrage en plein appel ferait
# perdre le fil, et c'est précisément le fil qui a de la valeur ici.
ETAT = os.path.join(DATA_DIR, "sessions.json")
# Au-delà, on coupe le début : un appel de vente qui dépasse 60 échanges n'existe pas,
# et laisser filer le contexte coûte cher sans rien apporter.
MAX_TOURS = 60

API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

PROSPECT = """Tu joues un prospect dans un appel de vente. L'utilisateur est le vendeur.

CONTEXTE DE L'APPEL
{contexte}

TON PERSONNAGE
Tu es intéressé, sinon tu ne serais pas là — mais tu n'es pas acquis. Tu es poli, occupé,
et tu as déjà été déçu par un prestataire avant lui.

COMMENT TU TE COMPORTES
- Tu réponds court. Tu ne déroules pas ta vie parce qu'on t'a posé une question molle.
  Question vague, réponse vague. Question précise, tu t'ouvres.
- Tu ne donnes ton vrai budget que si on te le demande franchement. Sinon tu restes flou.
- Tu ne sors PAS ta vraie objection en premier. D'abord la confortable (« c'est un peu
  cher », « je dois réfléchir »). La vraie — peur de t'engager, échec passé, quelqu'un
  d'autre à convaincre — ne sort que si on creuse deux fois.
- Si le vendeur se justifie, parle trop, enchaîne les arguments : tu décroches, tu deviens
  plus court, tu regardes ta montre.
- S'il te met face à une contradiction avec calme, tu la reconnais. Tu es de bonne foi.
- Tu ne dis JAMAIS oui à la première demande. Tu ne dis jamais non définitivement non plus
  au premier obstacle : tu temporises, comme dans la vraie vie.
- Tu n'achètes que si le vendeur a : cadré l'appel, compris ton enjeu réel, annoncé le prix
  sans s'excuser, et traité ta vraie objection. S'il en manque un, tu finis par « laisse-moi
  y réfléchir, je te reviens » — et tu ne reviens pas.

RÈGLES DU JEU
- Reste dans le rôle. Aucun commentaire, aucun conseil, aucune note pendant l'appel.
- Une seule réplique à la fois. Tu attends la réponse.
- Français parlé : phrases courtes, hésitations, interruptions. Jamais de paragraphe rédigé.
- Ne décris jamais tes intentions entre parenthèses. Tu parles, c'est tout."""

DEBRIEF = """Tu sors du rôle de prospect. Tu es maintenant coach de closing high-ticket,
direct et sans complaisance.

Analyse l'appel qui vient d'avoir lieu, du point de vue du prospect que tu jouais.

Format exact, en français, tutoiement :

NOTE : X/10 — [closé / R2 / perdu]

LE MOMENT OÙ TU M'AS PERDU
[l'instant précis, avec ma phrase citée, et ce que ça a déclenché chez le prospect]

CE QUE JE PENSAIS SANS TE LE DIRE
[2 ou 3 lignes, du point de vue du prospect]

LES 3 ÉTAPES QUE TU AS SAUTÉES
[parmi : cadre/agenda, pré-qualification, découverte de l'enjeu, challenge, validation,
pitch résultat, annonce du prix, isolation de l'objection. Cite ce qui manquait.]

LA QUESTION QUI M'AURAIT FAIT BASCULER
[une seule, mot pour mot]

À REFAIRE MAINTENANT
[une consigne concrète pour rejouer le même appel : quoi changer, exactement]

Ne félicite pas pour être poli."""

AIDE = (
    "🥊 <b>Sparring de closing</b>\n\n"
    "Je joue un prospect, tu me vends ton offre.\n\n"
    "<b>/nouveau</b> — démarre un appel (je te pose 4 questions de contexte)\n"
    "<b>/debrief</b> — je sors du rôle et je note ton appel\n"
    "<b>/rejouer</b> — on refait le même appel depuis le début, même contexte\n"
    "<b>/stop</b> — j'oublie tout\n\n"
    "<i>Conseil : réponds à la voix. Écrire te laisse le temps de réfléchir — "
    "c'est exactement ce temps que tu n'as pas en appel.</i>"
)

QUESTIONS = [
    "1/4 — Qu'est-ce que tu vends, en une phrase ?",
    "2/4 — À qui ? (métier, taille, chiffre d'affaires approximatif)",
    "3/4 — Ton prix ?",
    "4/4 — Qu'est-ce que tu veux travailler aujourd'hui ?\n"
    "<i>ex : le moment du prix · « je vais réfléchir » · le prospect qui compare · "
    "celui qui doit en parler à son associé</i>",
]


# --- état ---------------------------------------------------------------------

def _charger():
    try:
        with open(ETAT, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _ecrire(d):
    tmp = ETAT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)
    os.replace(tmp, ETAT)          # écriture atomique : pas de fichier à moitié écrit


def session(chat_id):
    return _charger().get(str(chat_id), {})


def sauver(chat_id, s):
    d = _charger()
    d[str(chat_id)] = s
    _ecrire(d)


# --- Telegram -----------------------------------------------------------------

def envoyer(chat_id, texte):
    try:
        requests.post(f"{API}/sendMessage",
                      json={"chat_id": chat_id, "text": texte, "parse_mode": "HTML"},
                      timeout=30).raise_for_status()
    except requests.HTTPError:
        # repli en texte brut : un message contenant du HTML non échappé serait refusé,
        # et un bot muet est pire qu'un bot sans mise en forme
        requests.post(f"{API}/sendMessage", json={"chat_id": chat_id, "text": texte},
                      timeout=30)


def typing(chat_id):
    try:
        requests.post(f"{API}/sendChatAction",
                      json={"chat_id": chat_id, "action": "typing"}, timeout=10)
    except Exception:
        pass


# --- Claude -------------------------------------------------------------------

def claude(systeme, messages, max_tokens=2000, effort="low"):
    """Un appel modèle. `max_tokens` couvre la RÉFLEXION AUTANT QUE LA RÉPONSE.

    C'est le piège de ce fichier : les modèles actuels réfléchissent avant de répondre, et
    un budget calé sur la longueur de la réplique attendue laisse la réflexion tout manger
    — le bot renvoie alors une réplique vide en plein appel. D'où la marge, et `effort` bas
    pour une conversation qui doit répondre du tac au tac (seuls les tokens réellement
    produits sont facturés).
    """
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    msg = client.messages.create(model=MODEL, max_tokens=max_tokens, system=systeme,
                                 output_config={"effort": effort}, messages=messages)
    texte = "".join(b.text for b in msg.content if b.type == "text").strip()
    if not texte:
        raise RuntimeError(f"réponse vide (stop_reason={msg.stop_reason})")
    return texte


def contexte_texte(reponses):
    return (f"- Ce que le vendeur vend : {reponses[0]}\n"
            f"- Son client type : {reponses[1]}\n"
            f"- Son prix : {reponses[2]}\n"
            f"- Ce qu'il veut travailler aujourd'hui : {reponses[3]}")


def demarrer_appel(chat_id, s):
    """Le prospect décroche. C'est lui qui parle en premier, comme au téléphone."""
    s["messages"] = []
    s["etape"] = "appel"
    typing(chat_id)
    systeme = PROSPECT.format(contexte=contexte_texte(s["reponses"]))
    ouverture = claude(systeme, [{"role": "user", "content":
                                  "L'appel commence, tu décroches. Une phrase, pas plus."}])
    s["messages"] = [{"role": "user", "content": "[l'appel commence]"},
                     {"role": "assistant", "content": ouverture}]
    sauver(chat_id, s)
    envoyer(chat_id, "☎️ <i>L'appel commence.</i>\n\n" + ouverture)


# --- boucle -------------------------------------------------------------------

def traiter(msg):
    chat_id = msg["chat"]["id"]
    texte = (msg.get("text") or "").strip()
    if not texte:
        return
    bas = texte.lower()
    s = session(chat_id)

    if bas in ("/start", "/aide", "/help"):
        envoyer(chat_id, AIDE)
        return
    if bas == "/stop":
        sauver(chat_id, {})
        envoyer(chat_id, "🗑 Session oubliée. <b>/nouveau</b> quand tu veux.")
        return
    if bas == "/nouveau":
        sauver(chat_id, {"etape": "contexte", "reponses": []})
        envoyer(chat_id, "🥊 On y va. Quatre questions, puis je décroche.\n\n" + QUESTIONS[0])
        return
    if bas == "/rejouer":
        if not s.get("reponses"):
            envoyer(chat_id, "Rien à rejouer. <b>/nouveau</b> pour commencer.")
            return
        envoyer(chat_id, "🔁 Même appel, on reprend au début.")
        demarrer_appel(chat_id, s)
        return
    if bas == "/debrief":
        if not s.get("messages"):
            envoyer(chat_id, "Pas d'appel en cours. <b>/nouveau</b> pour commencer.")
            return
        typing(chat_id)
        systeme = PROSPECT.format(contexte=contexte_texte(s["reponses"])) + "\n\n" + DEBRIEF
        # le débrief est le seul moment où on veut qu'il réfléchisse vraiment : c'est là
        # que se trouve toute la valeur de l'exercice
        analyse = claude(systeme, s["messages"] + [
            {"role": "user", "content": "DEBRIEF. Sors du rôle et analyse l'appel."}],
            max_tokens=8000, effort="medium")
        envoyer(chat_id, "📋 <b>Débrief</b>\n\n" + analyse +
                "\n\n<i>/rejouer pour refaire le même appel avec ça en tête.</i>")
        return

    if s.get("etape") == "contexte":
        s["reponses"].append(texte)
        if len(s["reponses"]) < len(QUESTIONS):
            sauver(chat_id, s)
            envoyer(chat_id, QUESTIONS[len(s["reponses"])])
            return
        demarrer_appel(chat_id, s)
        return

    if s.get("etape") != "appel":
        envoyer(chat_id, AIDE)
        return

    typing(chat_id)
    s["messages"].append({"role": "user", "content": texte})
    s["messages"] = s["messages"][-MAX_TOURS:]
    systeme = PROSPECT.format(contexte=contexte_texte(s["reponses"]))
    reponse = claude(systeme, s["messages"])
    s["messages"].append({"role": "assistant", "content": reponse})
    sauver(chat_id, s)
    envoyer(chat_id, reponse)


def main():
    requests.post(f"{API}/deleteWebhook", json={"drop_pending_updates": False}, timeout=15)
    print("[sparring] bot prêt, en écoute.")
    offset = None
    while True:
        try:
            r = requests.get(f"{API}/getUpdates",
                             params={"timeout": 50, "offset": offset}, timeout=70)
            for up in r.json().get("result", []):
                offset = up["update_id"] + 1
                if "message" in up:
                    try:
                        traiter(up["message"])
                    except Exception:
                        traceback.print_exc()
                        envoyer(up["message"]["chat"]["id"],
                                "⚠️ Erreur de mon côté. Réessaie, ou /nouveau.")
        except Exception as e:
            print(f"[sparring] {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
