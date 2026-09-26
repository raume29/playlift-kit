#!/bin/bash
# OS KADANS : installation en une commande (macOS).
#   ./install.sh            installe (venv, app dans le Dock, commande voir, hooks Claude Code)
#   ./install.sh --jarvis   installe aussi Jarvis local sans poser la question
#   ./install.sh --retirer  désinstalle (app, commande, hooks) ; le dossier reste, supprime-le à la main
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
NOM="OS KADANS"
vert() { printf "\033[32m%s\033[0m\n" "$1"; }
rouge() { printf "\033[31m%s\033[0m\n" "$1" >&2; }

if [ "$(uname)" != "Darwin" ]; then rouge "OS KADANS tourne sur macOS seulement."; exit 1; fi

if [ "$1" = "--retirer" ]; then
  APP="$(cat "$ICI/.app-chemin" 2>/dev/null)"
  curl -s -m 2 -H "X-Jeton: $(cat "$ICI/.jeton-8799" 2>/dev/null)" http://127.0.0.1:8799/quitter >/dev/null 2>&1 || true
  [ -n "$APP" ] && [ -d "$APP" ] && rm -rf "$APP" && echo "app retirée : $APP"
  for d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin"; do
    [ -L "$d/voir" ] && [ "$(readlink "$d/voir")" = "$ICI/voir" ] && rm "$d/voir" && echo "commande voir retirée de $d"
  done
  [ -x "$ICI/.venv/bin/python" ] && "$ICI/.venv/bin/python" "$ICI/hooks.py" retirer && "$ICI/.venv/bin/python" "$ICI/claude-code/configurer.py" retirer
  vert "Désinstallé. Tu peux supprimer le dossier $ICI."
  exit 0
fi

echo "1/7  Python"
PY=""
for c in python3.13 python3.12 python3.11 python3.10 python3 \
         /opt/homebrew/bin/python3.1[0-9] /usr/local/bin/python3.1[0-9] /Library/Frameworks/Python.framework/Versions/3.1[0-9]/bin/python3; do
  p="$(command -v "$c" 2>/dev/null)" || continue
  if "$p" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then PY="$p"; break; fi
done
if [ -z "$PY" ]; then
  rouge "Il faut Python 3.10 ou plus. Le plus simple : brew install python@3.12 (https://brew.sh), puis relance ./install.sh"
  exit 1
fi
echo "     $("$PY" --version) ($PY)"

echo "2/7  Claude Code"
if ! command -v claude >/dev/null 2>&1 && ! zsh -lc 'command -v claude' >/dev/null 2>&1; then
  rouge "Claude Code n'est pas installé. Installe-le : curl -fsSL https://claude.ai/install.sh | bash"
  rouge "puis lance « claude » une fois pour te connecter, et relance ./install.sh"
  exit 1
fi
echo "     ok"

echo "3/7  Dépendances (environnement isolé dans .venv)"
[ -x "$ICI/.venv/bin/python" ] || "$PY" -m venv "$ICI/.venv"
"$ICI/.venv/bin/python" -m pip install -q --upgrade pip
"$ICI/.venv/bin/python" -m pip install -q -r "$ICI/requirements.txt"
chmod +x "$ICI/voir" "$ICI/hook.py"
echo "     ok"

echo "4/7  L'app « $NOM » (Dock, Spotlight)"
if [ -w /Applications ]; then APPS=/Applications; else APPS="$HOME/Applications"; mkdir -p "$APPS"; fi
APP="$APPS/$NOM.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$ICI/icone.icns" "$APP/Contents/Resources/OsKadans.icns"
BASE="$("$ICI/.venv/bin/python" -c 'import sys; print(sys.base_prefix)')"
VER="$("$ICI/.venv/bin/python" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])')"
PYAPP="$BASE/Resources/Python.app/Contents/MacOS/Python"
if [ -x "$PYAPP" ]; then
  # interpréteur copié dans le bundle + venv miroir : le Dock affiche le nom et l'icône de l'OS, pas « Python »
  cp "$PYAPP" "$APP/Contents/MacOS/python-os"
  printf 'home = %s/bin\ninclude-system-site-packages = false\nversion = %s\n' "$BASE" "$VER" > "$APP/Contents/pyvenv.cfg"
  ln -s "$ICI/.venv/lib" "$APP/Contents/lib"
  INTERP='"$(dirname "$0")/python-os"'
else
  INTERP="'$ICI/.venv/bin/python'"
fi
cat > "$APP/Contents/MacOS/OsKadans" <<LANCEUR
#!/bin/bash
# déjà ouverte : on la ramène devant ; sinon on la lance
if curl -s -f -m 1 -H "X-Jeton: \$(cat '$ICI/.jeton-8799' 2>/dev/null)" http://127.0.0.1:8799/montrer >/dev/null 2>&1; then exit 0; fi
cd '$ICI'
exec $INTERP app.py >> os.log 2>&1
LANCEUR
chmod +x "$APP/Contents/MacOS/OsKadans"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDisplayName</key><string>$NOM</string>
  <key>CFBundleName</key><string>$NOM</string>
  <key>CFBundleExecutable</key><string>OsKadans</string>
  <key>CFBundleIconFile</key><string>OsKadans</string>
  <key>CFBundleIdentifier</key><string>ai.playlift.oskadans</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSMicrophoneUsageDescription</key><string>Jarvis t'écoute pour parler à ton chat Claude.</string>
</dict></plist>
PLIST
codesign --force --deep -s - "$APP" >/dev/null 2>&1 || true
echo "$APP" > "$ICI/.app-chemin"
echo "     $APP"

echo "5/7  Commande voir + hooks Claude Code"
LIEN=""
for d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin"; do
  if [ -d "$d" ] && [ -w "$d" ] && [[ ":$PATH:" == *":$d:"* ]]; then ln -sf "$ICI/voir" "$d/voir"; LIEN="$d/voir"; break; fi
done
[ -n "$LIEN" ] && echo "     voir → $LIEN" || echo "     (ajoute un alias : echo \"alias voir='$ICI/voir'\" >> ~/.zshrc)"
"$ICI/.venv/bin/python" "$ICI/hooks.py" installer | sed 's/^/     /'

echo "6/7  Claude Code à l'identique (barre d'état 2 lignes, thème Cybernet, plein écran, style concis)"
command -v jq >/dev/null 2>&1 || echo "     jq manque pour la barre d'état : brew install jq"
REP=o; [ -t 0 ] && read -r -p "     Appliquer ces réglages ? [O/n] " REP
case "$REP" in n|N|non) echo "     ignoré (plus tard : $ICI/.venv/bin/python $ICI/claude-code/configurer.py)";;
  *) "$ICI/.venv/bin/python" "$ICI/claude-code/configurer.py" | sed 's/^/     /';; esac

echo "7/7  Jarvis local (voix, gratuit, rien ne sort du Mac)"
if [ "$(uname -m)" != "arm64" ]; then
  echo "     ignoré : il faut un Mac Apple Silicon (M1 ou plus). Jarvis reste possible en mode OpenAI."
else
  REP=o; [ -t 0 ] && read -r -p "     Installer Jarvis local ? ~6 Go de modèles, 16 Go de mémoire conseillés [O/n] " REP
  case "$REP" in n|N|non) echo "     ignoré (plus tard : ./install.sh --jarvis)";;
    *) JARVIS=1;; esac
fi
[ "$1" = "--jarvis" ] && JARVIS=1
if [ -n "$JARVIS" ]; then
  "$ICI/.venv/bin/python" -m pip install -q -r "$ICI/requirements-jarvis.txt"
  mkdir -p "$ICI/modeles"
  KOKORO="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
  for f in kokoro-v1.0.onnx voices-v1.0.bin; do
    [ -s "$ICI/modeles/$f" ] || curl -fL --progress-bar -o "$ICI/modeles/$f" "$KOKORO/$f"
  done
  echo "     voix Kokoro ok ; Whisper et Qwen se téléchargent au premier « clic sur l'orbe » (~5 Go, une fois)"
fi

echo
vert "✅ OS KADANS est installé."
echo "   Lance-le : Spotlight (⌘ Espace) › « $NOM », ou tape  voir"
echo "   Jarvis : ⇧⌘V. Mode Local par défaut ; mode OpenAI en option (cp jarvis.env.exemple jarvis.env, colle ta clé)."
open -a "$APP" || true
