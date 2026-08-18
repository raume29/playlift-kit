# Agent de qualification — le filtre devant ton calendrier

Un formulaire de cinq questions, posé **avant** ton lien de réservation. À chaque
soumission, l'agent lit les réponses, décide si ça vaut un appel, et t'envoie le verdict
sur Telegram — avec la question à poser avant de bloquer le créneau.

Tu arrêtes de découvrir à la 35e minute que le prospect n'a pas le budget, ne décide pas
seul, ou n'a pas le problème que tu règles.

## Comment il juge

Jamais sur le budget déclaré — tout le monde ment sur le budget. Sur quatre choses ensemble :

1. **Le problème** — celui que tu règles, ou un autre ?
2. **Le chiffre** — a-t-il déjà mesuré ce que ça lui coûte ? Quelqu'un qui a chiffré son
   problème l'a déjà accepté comme un coût. Il peut payer pour le régler.
3. **La décision** — seul, et sous quel délai ?
4. **L'urgence** — qu'est-ce qui l'empêche d'attendre six mois ? Sans réponse à ça, il
   attendra six mois.

Dans le doute, il classe **tiède**, jamais chaud. Un appel pris pour rien coûte une heure
et le moral ; un appel refusé à tort coûte un email de plus.

**Le lead n'apprend jamais son score.** Retenu, il voit ton calendrier. Sinon, il lit que tu
lui répondras personnellement — ce que tu fais. On ne braque personne : un tiède
d'aujourd'hui peut signer dans trois mois.

## Déploiement (10 min)

1. Fork ce dépôt.
2. Sur [render.com](https://render.com) : **New** → **Blueprint** → ton fork. Il lit
   `qualif-agent/render.yaml`.
3. Renseigne les variables (voir `.env.example`) : ta clé Anthropic, ton bot Telegram si tu
   en veux un, ce que tu vends, et l'URL de ton calendrier.
4. **Deploy**. Render te donne une URL — c'est elle que tu mets partout où tu envoyais ton
   lien de réservation : bio, posts, signature, DM.

En local pour essayer :

```bash
cd qualif-agent
pip install -r requirements.txt
export ANTHROPIC_API_KEY="sk-ant-..."
export OFFRE="ce que tu vends, en une phrase"
python agent.py          # http://localhost:8000
```

> Ouvre Claude Code dans ce dossier et demande *« déploie cet agent sur Render »* : il lit
> le `render.yaml` et te guide.

## À adapter

- **Les questions** : dans `index.html`. Les cinq par défaut marchent pour la plupart des
  offres high-ticket, mais celle qui compte vraiment chez toi, ajoute-la.
- **La sévérité** : dans `agent.py`, constante `PROMPT`. Si tu reçois trop de tièdes,
  durcis le critère 2 ; si tu ne reçois plus personne, c'est ton acquisition qu'il faut
  regarder, pas le filtre.

---

Qualifier mieux te fait gagner des heures. Ça ne change pas le fait que **c'est toi qui
vends** : tant que chaque euro passe par ton agenda, ton agenda est ton plafond.
→ [playlift.ai](https://playlift.ai)
