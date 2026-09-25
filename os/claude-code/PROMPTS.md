# Les prompts pour régler Claude Code comme OS KADANS

L'installeur fait tout ça tout seul (étape 6). Ces prompts servent si tu préfères que Claude le fasse devant toi, si tu veux changer une couleur, ou si tu as sauté l'étape. Colle-les un par un dans un chat d'OS KADANS.

## 1. Tout d'un coup

```text
Règle mon Claude Code comme OS KADANS. Lance `python3 ~/playlift-kit/os/claude-code/configurer.py`, puis lis ~/.claude/settings.json et dis-moi en trois lignes ce qui a changé. Ne touche à rien d'autre (permissions, hooks, plugins, modèle).
```

## 2. La barre d'état en deux lignes

```text
Installe la barre d'état de ~/playlift-kit/os/claude-code/statusline.sh dans ~/.claude/statusline-os-kadans.sh et branche-la dans ~/.claude/settings.json (statusLine type command, padding 0, refreshInterval 10). Ligne 1 : dossier, modèle, jauge du contexte, coût, durée, lignes modifiées. Ligne 2 : quotas 5 h et 7 jours avec l'heure de remise à zéro et le rythme (OK, LIMITE, TROP VITE). Vérifie que jq est installé, sinon dis-moi la commande.
```

## 3. Le thème Cybernet

```text
Copie ~/playlift-kit/os/claude-code/cybernet.json dans ~/.claude/themes/ et mets "theme": "custom:cybernet" dans ~/.claude/settings.json. Cyan pour Claude, magenta pour mes messages, vert pour les succès.
```

## 4. Plein écran, réponses courtes

```text
Dans ~/.claude/settings.json, mets "tui": "fullscreen" et "outputStyle": "Concise". Explique-moi en une phrase ce que change chacun.
```

## 5. Les raccourcis

```text
Ajoute dans ~/.claude/keybindings.json, sans écraser ceux que j'ai déjà : alt+entrée = retour à la ligne, ctrl+k ctrl+n = arrêter les agents, ctrl+k ctrl+t = afficher les tâches, ctrl+k ctrl+s = recherche globale.
```

## 6. Changer les couleurs

```text
Ouvre ~/.claude/themes/cybernet.json. Je veux [ma couleur, par exemple orange #ff6b1a] à la place du cyan pour Claude et la bordure du prompt. Garde un contraste lisible sur fond noir et montre-moi le diff.
```

Et pour l'OS lui-même : ⚙ en haut à droite (5 thèmes, mode clair, 6 polices, taille). Pour coller au thème Cybernet, prends **Ops**.

## Revenir en arrière

```text
Lance `python3 ~/playlift-kit/os/claude-code/configurer.py retirer`. L'ancien fichier est aussi gardé dans ~/.claude/settings.json.avant-os-kadans-config.
```
