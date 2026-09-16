# Machine à commentaires LinkedIn

Une barre au-dessus de chaque champ de commentaire LinkedIn. Un clic : Claude lit le post et
les commentaires déjà présents, puis propose trois commentaires dans trois registres. Tu
choisis, tu retouches, tu publies. Rien ne part tout seul.

Elle tourne avec **ta** clé API Anthropic, depuis **ton** navigateur, sans aucun serveur
entre les deux. Le prompt est dans `prompt.js`, en clair : modifie-le.

## Installation (5 minutes, dans l'ordre)

### 1. Ta clé Anthropic

C'est un compte API, différent de l'abonnement Claude Pro ou Max : il faut cette clé même si
tu payes déjà un abonnement.

1. [console.anthropic.com](https://console.anthropic.com) : crée un compte.
2. **Billing** : ajoute une carte et charge **5 $** (prépayé ; sans crédit la clé répond
   « credit balance is too low »). 5 $ = plusieurs centaines de commentaires.
3. **Spend limit** : 10 $ par mois. Tu ne dépenseras jamais plus.
4. **API Keys › Create Key**, copie la clé `sk-ant-…` tout de suite (affichée une seule fois).

### 2. L'extension dans Chrome

1. Télécharge ou clone ce dossier. Garde-le dans un endroit stable (Documents, pas
   Téléchargements) : Chrome le relit à chaque démarrage.
2. `chrome://extensions` › active **Mode développeur** (en haut à droite).
3. **Charger l'extension non empaquetée** › choisis le dossier `extension-commentaire`
   (celui qui contient `manifest.json`).
4. Clique l'icône de l'extension (pièce de puzzle › « Machine à commentaires »). Colle la
   clé, ton prénom, **Tester la clé** → tu dois lire « Clé OK ». Puis **Enregistrer**.
5. Ouvre LinkedIn (recharge la page si elle était déjà ouverte), clique dans un champ de
   commentaire : la barre **⚡ Commentaire** apparaît au-dessus. Raccourci `⌘⇧K` / `Ctrl⇧K`.

**Coût** : 2 à 4 centimes par commentaire avec Opus 5, moins d'un centime avec Sonnet 5.

### Si ça ne marche pas

| Message | Cause | Quoi faire |
|---|---|---|
| clé absente | pas enregistrée, ou espace collé | recolle, Tester, Enregistrer |
| clé refusée | clé fausse ou supprimée | crée une nouvelle clé |
| credit balance is too low | aucun crédit | Billing › ajoute 5 $ |
| la barre n'apparaît pas | page ouverte avant l'installation | recharge LinkedIn ; vérifie `chrome://extensions` (activée, pas d'erreur rouge) |
| délai dépassé | Opus > 90 s, rare | reclique |

Le dossier ne doit pas être supprimé ni déplacé : Chrome dirait « extension corrompue ».

## Les trois registres

| Registre | Ce que c'est | Longueur |
|---|---|---|
| **Long** | Accord bref, le cran que personne dit, un cas concret de ton terrain, une phrase qui tranche | 300 à 450 caractères |
| **Court** | Une vérité générale qui fait un pas de plus dans la direction du post | 8 à 15 mots |
| **Humain** | Ce qu'un humain lâche sous le post d'un créateur qu'il suit | 1 à 2 phrases |

Le registre long est celui qui porte : c'est la mécanique des six commentaires de Romain
qui ont fait le plus d'impressions (l'un a ramené un client). Ils sont dans `prompt.js`
comme exemples ; remplace-les par les tiens dès que tu en as trois qui ont marché.

## Ce qui fait la différence : le popup

Dans **Ma voix, mon terrain, mes exemples** :
- **Mon terrain** : ce que tu vends, à qui, deux ou trois choses vues chez tes clients avec
  un chiffre. C'est là que le modèle puise le cas concret. Vide, il n'inventera rien et le
  registre long sera plus plat.
- **Ma voix** : comment tu écris.
- **Mes exemples** : tes commentaires qui ont porté, un par ligne.

## Ce que l'extension ne fait pas

Elle ne clique jamais sur Publier, n'envoie aucun message, ne suit personne, ne fait
aucune requête vers LinkedIn. Elle lit ce qui est affiché à l'écran, et écrit dans le
champ. Le reste, c'est toi.

## Sécurité de la clé

La clé est stockée dans `chrome.storage.local` de ton navigateur et n'est envoyée qu'à
`https://api.anthropic.com` (seul hôte autorisé dans `manifest.json`). Mets une limite de
dépense sur la clé dans la console Anthropic, et révoque-la si tu désinstalles.

Licence MIT.
