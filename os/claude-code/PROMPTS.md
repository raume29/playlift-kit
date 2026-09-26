# Les prompts pour régler Claude Code comme OS KADANS

Tu n'as rien à faire : l'installeur règle Claude Code tout seul (étape 6). Ces prompts servent seulement dans trois cas : tu as sauté l'étape 6, tu veux voir Claude le faire devant toi, ou tu veux changer une couleur. Copie le prompt, colle-le dans un chat Claude Code, valide.

## 1. Tout d'un coup

Le plus simple : tout ce que fait l'étape 6, en un seul prompt.

```text
Règle mon Claude Code comme OS KADANS. Lance `python3 ~/playlift-kit/os/claude-code/configurer.py`, puis lis ~/.claude/settings.json et dis-moi en trois lignes ce qui a changé. Ne touche à rien d'autre (permissions, hooks, plugins, modèle).
```

## 2. La barre d'état en deux lignes

Seulement la barre sous la zone de saisie : remplissage du contexte, coût, et combien de quota il te reste.

```text
Installe la barre d'état de ~/playlift-kit/os/claude-code/statusline.sh dans ~/.claude/statusline-os-kadans.sh et branche-la dans ~/.claude/settings.json (statusLine type command, padding 0, refreshInterval 10). Ligne 1 : dossier, modèle, jauge du contexte, coût, durée, lignes modifiées. Ligne 2 : quotas 5 h et 7 jours avec l'heure de remise à zéro et le rythme (OK, LIMITE, TROP VITE). Vérifie que jq est installé, sinon dis-moi la commande.
```

## 3. Le thème Cybernet

Seulement les couleurs de Claude Code : cyan pour Claude, magenta pour toi.

```text
Copie ~/playlift-kit/os/claude-code/cybernet.json dans ~/.claude/themes/ et mets "theme": "custom:cybernet" dans ~/.claude/settings.json. Cyan pour Claude, magenta pour mes messages, vert pour les succès.
```

## 4. Plein écran, réponses courtes

Claude Code prend toute la fenêtre et répond en quelques lignes au lieu de pavés.

```text
Dans ~/.claude/settings.json, mets "tui": "fullscreen" et "outputStyle": "Concise". Explique-moi en une phrase ce que change chacun.
```

## 5. Les raccourcis

Quatre raccourcis clavier, sans toucher à ceux que tu as déjà.

```text
Ajoute dans ~/.claude/keybindings.json, sans écraser ceux que j'ai déjà : alt+entrée = retour à la ligne, ctrl+k ctrl+n = arrêter les agents, ctrl+k ctrl+t = afficher les tâches, ctrl+k ctrl+s = recherche globale.
```

## 6. Changer les couleurs

Remplace la couleur entre crochets par la tienne avant de coller.

```text
Ouvre ~/.claude/themes/cybernet.json. Je veux [ma couleur, par exemple orange #ff6b1a] à la place du cyan pour Claude et la bordure du prompt. Garde un contraste lisible sur fond noir et montre-moi le diff.
```

Et pour l'OS lui-même : ⚙ en haut à droite (5 thèmes, mode clair, 6 polices, taille). Pour coller au thème Cybernet, prends **Ops**.

## Revenir en arrière

Tu n'aimes pas : ce prompt remet tes réglages Claude Code comme avant.

```text
Lance `python3 ~/playlift-kit/os/claude-code/configurer.py retirer`. L'ancien fichier est aussi gardé dans ~/.claude/settings.json.avant-os-kadans-config.
```
