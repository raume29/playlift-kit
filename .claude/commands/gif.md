Fabrique avec l'utilisateur une infographie animée pour LinkedIn : un point qui parcourt ses étapes, chacune s'allume à son passage. Elle sort en GIF qui boucle, se poste comme une photo et se lit dans le fil sans bouton lecture.

## Le principe

L'œil ne lit pas une infographie, il suit ce qui bouge. Une seule chose bouge (le point), tout le reste est fixe : c'est ce qui garde l'image lisible et le fichier léger. Le moteur est `gif/gif.py` : tu écris une spec JSON, il code la page, la filme image par image et sort le GIF. Tu ne réécris jamais le moteur pour un post, tu remplis la spec.

Tu avances **une question à la fois**, et tu attends la réponse.

## Les règles

1. **4, 6 ou 8 étapes.** 6 est le meilleur format. Une étape = un titre de 3 mots au plus + une phrase de 8 mots au plus. Si ça ne tient pas, coupe le texte, pas la police.
2. **Un seul surlignage** (`[[ ]]`), titre et cta compris. Il tombe sur le mot qui porte l'idée, en fin de phrase.
3. **Le titre tient en 2 lignes** et dit une chose vraie et précise, pas une promesse vague.
4. **Aucun chiffre inventé.** S'il n'a pas mesuré, pas de chiffre.
5. **Trois couleurs** : fond, texte, accent. L'accent sert au point, au tracé, aux étapes allumées et au surlignage, à rien d'autre.
6. Si c'est un lead magnet : le mot à commenter va dans `cta` (« Commente [[MOT]] »), et **jamais dans le texte du post**. Dans ce cas, le titre n'a pas de surlignage.

## Le déroulé

### Étape 1 : vérifier l'installation

Lance `python3 -c "import playwright"` et `ffmpeg -version`. S'il manque quelque chose, donne-lui la commande exacte et attends :

```bash
pip install playwright && python3 -m playwright install chromium
brew install ffmpeg        # macOS ; Windows : winget install ffmpeg
```

### Étape 2 : le sujet

Demande en une question : le sujet, à qui il parle, et si c'est un lead magnet (et alors quel mot à commenter). S'il a déjà un post écrit, demande-lui de le coller : les étapes s'y trouvent souvent.

### Étape 3 : les étapes

Propose **6 étapes** tirées de sa matière, dans l'ordre où on les fait, au format de la règle 1. Puis **3 titres** de moins de 10 mots, chacun avec son mot surligné. Il tranche.

### Étape 4 : la charte

Demande ses trois couleurs (en hexadécimal, ou « comme mon logo » : alors demande le code) et sa police Google Fonts. Sans réponse : fond `#111114`, texte `#F3F3F0`, accent `#FF4A1C`, Inter. Vérifie que le texte se lit sur le fond : sinon dis-le avant de rendre.

### Étape 5 : le rendu

Écris la spec dans `gif/<sujet-court>.json` (modèle : `gif/exemple.json`), lance `python3 gif/gif.py gif/<sujet-court>.json`, puis **ouvre `<sujet-court>-fixe.png` et regarde-la** avant de la montrer : rien ne déborde des cartes, pas de mot seul sur une ligne, le titre tient en 2 lignes, le bon mot est surligné. Corrige la spec et relance si besoin. Le rendu prend environ une minute.

### Étape 6 : la publication

Donne-lui la checklist, telle quelle :

```
☐ Sur ordinateur : « Commencer un post » → icône PHOTO (pas vidéo) → le .gif
☐ Dans l'aperçu, le point bouge. Figé ? Retire le GIF et remets-le.
☐ Le GIF fait moins de 5 Mo (le rendu affiche sa taille).
☐ Le mot à commenter est sur l'image, pas dans le texte.
☐ Le texte finit par « Accès gratuit ci-dessous 👇 ».
☐ Chaque commentaire reçoit une réponse à la main, et le lien part en message privé après la connexion.
☐ En secours, le .mp4 se poste comme une vidéo (il perd la lecture muette en boucle).
```

## Ce que tu ne fais jamais

Animer plus d'une chose, ajouter une 4e couleur, deux surlignages, un chiffre qu'il n'a pas donné, publier à sa place.
