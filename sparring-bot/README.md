# Sparring bot — un prospect difficile dans ton Telegram

Tu lui parles comme à un vrai prospect. Il temporise, il compare, il te dit qu'il va
réfléchir, et il ne sort sa vraie objection que si tu creuses deux fois. À la fin, `/debrief` :
il sort du rôle et te dit **le moment exact où tu l'as perdu**.

Tu peux rejouer le même appel autant de fois que tu veux. C'est là que ça se joue : ce n'est
pas la variété qui fait progresser, c'est de refaire le même moment jusqu'à le tenir.

---

## Ce qu'il te faut

- **Un bot Telegram** — gratuit, 2 minutes.
- **Une clé API Anthropic** — [console.anthropic.com](https://console.anthropic.com). Compte
  à recharger, pas d'abonnement. Un appel d'entraînement complet coûte quelques centimes.
- **Python 3.10+** si tu le lances sur ta machine, ou un compte
  [Render](https://render.com) gratuit pour qu'il tourne en permanence.

---

## 1. Crée ton bot Telegram (2 min)

1. Dans Telegram, ouvre une conversation avec **@BotFather**.
2. Envoie `/newbot`.
3. Donne-lui un nom (ce que tu veux) puis un identifiant qui finit par `bot`
   (ex. `mon_sparring_bot`).
4. BotFather te renvoie un jeton du type `123456789:AAH...`. **Garde-le**, c'est ton
   `TELEGRAM_TOKEN`.

## 2. Lance-le

### Sur ta machine, pour essayer tout de suite

```bash
cd sparring-bot
pip install -r requirements.txt

export TELEGRAM_TOKEN="le-jeton-de-botfather"
export ANTHROPIC_API_KEY="ta-clé-anthropic"

python bot.py
```

Va parler à ton bot dans Telegram : `/nouveau`. Tant que le terminal tourne, le bot répond.

### En permanence, sur Render (gratuit)

1. Fork ce dépôt sur ton compte GitHub.
2. Sur [render.com](https://render.com) : **New** → **Blueprint** → choisis ton fork.
   Render lit `sparring-bot/render.yaml` tout seul.
3. Il demande les deux variables : colle `TELEGRAM_TOKEN` et `ANTHROPIC_API_KEY`.
4. **Deploy**. Une minute plus tard, ton bot répond même ton ordinateur éteint.

> Tu bloques ? Ouvre Claude Code dans ce dossier et demande-lui : *« déploie ce bot sur
> Render »*. Il lit le `render.yaml` et te guide pas à pas.

---

## Utilisation

| Commande | Effet |
|---|---|
| `/nouveau` | Quatre questions de contexte (ce que tu vends, à qui, ton prix, ce que tu veux travailler), puis le prospect décroche |
| `/debrief` | Il sort du rôle : note sur 10, le moment où tu l'as perdu, ce qu'il pensait sans le dire, la question qui l'aurait fait basculer |
| `/rejouer` | Même appel, même contexte, depuis le début |
| `/stop` | Il oublie tout |

**Réponds à la voix.** Telegram transcrit tes messages vocaux, et écrire te laisse le temps
de réfléchir — exactement le temps que tu n'as pas en appel. Beaucoup de gens qui vendent
très bien à l'écrit se découvrent lents à l'oral.

---

## Les trois moments qui font mal

**Le silence après le prix.** Annonce-le, puis ne dis plus rien. La plupart des fondateurs
enchaînent sur une justification dans la seconde — et c'est cette justification qui fait
baisser le prix, pas le prix.

**La deuxième couche d'objection.** « C'est cher » n'est presque jamais la vraie. Creuse
deux fois avant de répondre : par rapport à quoi, puis ce qui se passerait si le budget
n'était pas un sujet.

**La fin sans décision.** Si tu n'as pas annoncé au début qu'on déciderait à la fin, tu n'as
aucun droit de demander une décision. Le bot te le fera payer à chaque fois.

---

## Réglages

Tout est dans les variables d'environnement (voir `.env.example`) :

- `MODEL` — par défaut `claude-sonnet-5`. Suffisant pour jouer un prospect.
- `DATA_DIR` — où sont gardées les sessions. `/data` sur Render, le dossier courant sinon.

Le personnage se modifie dans `bot.py`, constante `PROSPECT`. Rends-le plus dur, donne-lui
ton secteur, fais-lui sortir l'objection que tu entends vraiment. C'est fait pour.

---

## Et après

Ce bot corrige ta façon de vendre. Il ne change pas le fait que c'est **toi** qui vends :
tant que chaque euro passe par ton agenda, ton agenda est ton plafond.

→ [playlift.ai](https://playlift.ai)
