# OS KADANS

Une seule fenêtre pour travailler avec Claude Code : tes chats en onglets à gauche, le terminal au centre, **ce que Claude fabrique s'affiche en haut** (page HTML, PDF, image, Markdown, site), et un moniteur qui montre en direct chaque action de Claude. Jarvis en option : tu parles, il écrit dans ton chat.

Gratuit, open source (MIT), tout tourne sur ton Mac. Aucun compte, aucun serveur, aucune donnée qui sort.

## Ce qu'il y a dedans

| | |
|---|---|
| **Chats en onglets** | ⌘T ouvre un chat, Claude démarre tout seul. Onglets réordonnables à la souris, titre = titre de la session. |
| **Livrables en haut** | Claude écrit un .html, .pdf, .png, .svg : il s'affiche au-dessus du terminal, rangé dans le chat qui l'a produit. Onglet **Tous** pour tout voir. |
| **Moniteur** | ⌘J : ce que fait Claude en direct (prompt, chaque outil avec sa durée, les modifs avant/après, les pages web consultées). **AUTO** l'ouvre dès que Claude cherche sur le web ou lance un agent. |
| **Reprise sans perte** | Tu fermes, tu rouvres : chaque chat revient dans son onglet, avec sa session Claude et ses livrables. |
| **Fichiers** | Glisse un fichier ou colle une capture (⌘V) dans le terminal : Claude reçoit son chemin. Bouton **+ Fichier** pour le sélecteur macOS. |
| **Thèmes** | ⚙ : sombre ou clair, 5 thèmes (Ops, Ambre, Glace, Synth, Mono), 6 polices, taille du texte. |
| **Claude Code à l'identique** | Barre d'état en deux lignes (contexte, coût, quotas 5 h et 7 j avec le rythme), thème Cybernet, plein écran, réponses concises, raccourcis. Appliqué par l'installeur, ou par les prompts de `claude-code/PROMPTS.md`. |
| **Jarvis** (option) | ⇧⌘V : assistant vocal (OpenAI Realtime). « Dis à Claude de… » écrit dans ton chat actif, « qu'est-ce qu'il a répondu ? » te résume l'écran. Tu valides toi-même chaque autorisation, dans le chat. |

## Installer (5 minutes)

Il faut : un Mac (macOS 13+), [Claude Code](https://claude.com/claude-code) déjà connecté (`claude` marche dans ton terminal), Python 3.10+ (`brew install python@3.12` si besoin).

```bash
git clone https://github.com/raume29/playlift-kit.git ~/playlift-kit
cd ~/playlift-kit/os && ./install.sh
```

L'installeur crée un environnement Python isolé dans `os/.venv`, pose l'app **OS KADANS** dans Applications (Dock, Spotlight), la commande `voir`, et six hooks dans `~/.claude/settings.json` (copie de l'ancien fichier gardée à côté : `settings.json.avant-os-kadans`).

Premier lancement : macOS peut demander d'ouvrir une app non signée. Clic droit sur l'app › **Ouvrir**, une seule fois.

## Utiliser

| Raccourci | |
|---|---|
| ⌘T / ⌘W | nouveau chat / fermer |
| ⌘1…9 | changer de chat |
| ⌘L | replier / déplier les livrables |
| ⌘J / ⇧⌘J | moniteur en panneau / en fenêtre à droite |
| ⌘N | nouvelle fenêtre |
| ⌘B | cacher la colonne des chats |
| ⇧⌘F | livrable en plein écran |
| ⇧⌘V | Jarvis |
| ⌘K | effacer le terminal |

Commande `voir`, depuis n'importe quel terminal :

```bash
voir rapport.pdf          # affiche un fichier (ou une URL) dans l'OS
voir                      # ramène la fenêtre devant
voir redemarrer           # relance, les chats reprennent où ils étaient
voir quitter
```

## Claude Code à l'identique

L'étape 6 de l'installeur règle Claude Code comme sur les captures : `claude-code/configurer.py` pose la barre d'état (`~/.claude/statusline-os-kadans.sh`, il faut `jq`), le thème `custom:cybernet`, `tui: fullscreen`, `outputStyle: Concise` et quatre raccourcis, sans toucher au reste de ton `settings.json`. Tu préfères que Claude le fasse devant toi, ou changer une couleur : les prompts prêts à coller sont dans [`claude-code/PROMPTS.md`](claude-code/PROMPTS.md). Retour arrière : `python3 claude-code/configurer.py retirer`.

## Jarvis (facultatif)

```bash
cd ~/playlift-kit/os && cp jarvis.env.exemple jarvis.env && open -e jarvis.env
```

Colle ta clé OpenAI après `OPENAI_API_KEY=` ([platform.openai.com](https://platform.openai.com/api-keys)), enregistre. Pas besoin de relancer. La clé reste sur ton Mac : l'OS demande un jeton éphémère à chaque session vocale. Au premier clic sur l'orbe, macOS demande le micro : accepte.

## Si ça coince

| Symptôme | Geste |
|---|---|
| « Il faut Python 3.10 » | `brew install python@3.12`, relance `./install.sh` |
| « Claude Code n'est pas installé » | `curl -fsSL https://claude.ai/install.sh \| bash`, lance `claude` une fois, relance |
| L'app ne s'ouvre pas | clic droit › Ouvrir ; sinon regarde `os/os.log` |
| Un livrable ne s'affiche pas | `voir chemin/du/fichier.html` ; les .md s'ouvrent seulement à la main |
| Jarvis : erreur micro | Réglages Système › Confidentialité › Microphone › OS KADANS ; ou bouton **Chrome** du panneau |
| La barre d'état reste vide | `brew install jq`, puis ouvre un nouveau chat |

## Désinstaller

```bash
cd ~/playlift-kit/os && ./install.sh --retirer
```

Retire l'app, la commande `voir`, les hooks et les réglages Claude Code de l'étape 6 (les autres hooks de ton `settings.json` ne bougent pas). Supprime ensuite le dossier.

## Comment c'est fait

`app.py` : fenêtre pywebview, serveur local `127.0.0.1:8799` (page + API) et websocket `8798` (un pty par chat, xterm.js). `hook.py` : appelé par Claude Code à chaque outil, il pousse les livrables et nourrit le moniteur ; hors d'un terminal de l'OS il ne fait qu'afficher les livrables finis. `static/` : l'interface. `etat.json` : fenêtre, onglets, reprise. Le serveur local exige un jeton secret (fichier `.jeton-8799`, lisible par toi seul) et refuse toute requête venue d'un site web : une page ouverte dans ton navigateur ne peut pas taper dans tes terminaux. Tout est local, rien ne part sur Internet sauf Claude Code lui-même et, si tu l'actives, Jarvis vers OpenAI.

---

Fait par [Playlift](https://playlift.ai). Licence MIT : prends, modifie, partage.
