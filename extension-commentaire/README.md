# Machine à commentaires LinkedIn

Une barre au-dessus de chaque champ de commentaire LinkedIn. Un clic : Claude lit le post et
les commentaires déjà présents, puis propose trois commentaires dans trois registres. Tu
choisis, tu retouches, tu publies. Rien ne part tout seul.

Elle tourne avec **ta** clé API Anthropic, depuis **ton** navigateur, sans aucun serveur
entre les deux. Le prompt est dans `prompt.js`, en clair : modifie-le.

## Installation (5 minutes)

1. Télécharge ce dossier (`extension-commentaire/`) ou clone le dépôt.
2. Chrome : ouvre `chrome://extensions`, active **Mode développeur** (en haut à droite),
   clique **Charger l'extension non empaquetée**, choisis le dossier `extension-commentaire`.
3. Crée une clé sur [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   (compte à recharger : un commentaire coûte quelques centimes).
4. Clique l'icône de l'extension, colle la clé, ton prénom, **Tester la clé**, **Enregistrer**.
5. Ouvre LinkedIn, clique dans un champ de commentaire : la barre **⚡ Commentaire** apparaît.

Raccourci : `⌘⇧K` (ou `Ctrl⇧K`) depuis le champ de commentaire.

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
