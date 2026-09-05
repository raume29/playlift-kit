# Playlift Kit

Les outils de vente que j'utilise, en libre accès. Ils tournent chez toi, sur tes vrais
calls, avec **Claude Code** — pas de compte à créer, pas de données envoyées quelque part.

> Pour qui : tu vends une offre high-ticket et tu fais tes appels de vente toi-même.
> Si tu n'as jamais enregistré un call, commence par là — la moitié de ces outils s'en nourrit.

---

## Installation (3 minutes, une fois)

**1. Installe Claude Code** — c'est l'assistant d'Anthropic qui tourne dans ton terminal.

```bash
npm install -g @anthropic-ai/claude-code
```

**2. Clone ce dépôt et entre dedans**

```bash
git clone https://github.com/raume29/playlift-kit.git
cd playlift-kit
```

**3. Lance Claude Code**

```bash
claude
```

Tape `/` : les commandes du kit apparaissent dans la liste. C'est tout — il n'y a rien à
configurer, aucune clé API à fournir, ton abonnement Claude suffit.

---

## Les outils

### Ceux qui tournent dans Claude Code

Dépose tes transcripts d'appels dans `transcripts/` (fichiers `.txt` ou `.md` — tous les
outils de visio savent les exporter), puis :

| Commande | Ce qu'elle fait |
|---|---|
| `/audit-call` | Note ton appel étape par étape sur ma grille de closing, et te dit **les deux moments où tu as perdu la vente** |
| `/objections` | Compare **tous** tes appels perdus et sort les 3 objections qui reviennent, avec la réponse à chacune |
| `/relances` | Écrit tes 4 relances datées à partir de ce qui a réellement bloqué en appel |
| `/offre` | Reformule ce que tu vends en **offre à résultat**, au prix que ce résultat justifie |
| `/prix` | Calcule ton prix à partir de la valeur du résultat pour le client, pas de ton temps passé |
| `/brief` | Transforme les notes de ton setter en brief d'appel exploitable par un closer |
| `/tri` | Trie tes messages entrants (DM, commentaires) et sort les leads chauds, classés |
| `/plafond` | Calcule ce que ton agenda te coûte chaque mois, en euros, à partir de tes chiffres |
| `/posts` | Écrit avec toi ton **post lead magnet** en 9 blocs : objectif, 10 accroches notées, corps bloc par bloc, audit valeur, crible mobile, texte de l'image, message d'envoi, relance J+3 et calendrier de la semaine |

### Ceux que tu déploies

| Dossier | Ce que tu obtiens |
|---|---|
| [`sparring-bot/`](sparring-bot/) | Un **bot Telegram** qui joue un prospect difficile. Tu lui parles, il temporise, il négocie, il te sort « je vais réfléchir ». Tu t'entraînes sur lui au lieu de brûler tes vrais leads. Déploiement en 10 minutes, hébergement gratuit. |
| [`qualif-agent/`](qualif-agent/) | Un **agent de qualification** : un formulaire devant ton calendrier qui note chaque lead entrant (budget, urgence, décideur) et t'envoie le verdict sur Telegram avant que le créneau ne soit pris. |

---

## Ce que ces outils ne règlent pas

Ils corrigent ta façon de vendre. Ils ne changent pas le fait que **c'est toi qui vends** :
tant que chaque euro passe par ton agenda, ton agenda est ton plafond. Aucun script, aucun
prompt et aucun agent ne règle ça — il faut quelqu'un d'autre au bout du téléphone.

C'est mon métier : je construis l'offre high-ticket de mes clients et l'équipe de vente qui
va avec, puis je pilote le closing et l'acquisition. 0 € fixe, uniquement à la commission
sur le CA collecté. → **[playlift.ai](https://playlift.ai)**

---

## Questions fréquentes

**Mes transcripts partent quelque part ?**
Ils restent sur ta machine. Claude Code lit les fichiers localement et n'envoie à Anthropic
que ce dont il a besoin pour répondre, comme n'importe quelle conversation avec Claude. Ce
dépôt n'a aucun serveur, aucune base de données et aucune télémétrie. Le dossier
`transcripts/` est d'ailleurs ignoré par Git : tu ne risques pas de les publier par accident.

**Je n'ai pas d'abonnement Claude.**
Les commandes marchent aussi en copiant leur contenu dans [claude.ai](https://claude.ai)
gratuitement — ouvre le fichier `.claude/commands/<nom>.md`, colle-le, ajoute ton transcript.
Tu perds l'accès automatique à tes fichiers, rien d'autre.

**Je peux modifier les prompts ?**
Oui, c'est fait pour. Ce sont des fichiers Markdown. Adapte la grille à ton offre, ta
tarification et tes objections : elle sera meilleure que la mienne pour ton marché.

**Ça marche avec quel outil de visio ?**
Tous ceux qui exportent un transcript : Fathom, Fireflies, Zoom, Google Meet, Teams. À
défaut, l'enregistrement audio suffit, la plupart des outils le transcrivent.

---

Romain Barre — [playlift.ai](https://playlift.ai) · Scale Partner. 9 ans de vente
high-ticket en ligne, +10 M€ vendus, 65 % de taux de close.

Licence MIT : prends, modifie, revends si ça t'amuse.
