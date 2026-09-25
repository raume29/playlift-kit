#!/usr/bin/env bash
# Claude Code status line, 2 lignes, vert phosphore.
#   L1  ▸ dossier ▍ modèle · style ▍ ctx jauge % tokens ▍ coût · durée · lignes
#   L2  ⚡ 5h jauge % ↻ restant → reset ◉ rythme ▍ 7d jauge % ↻ restant → reset ◉ rythme

export LC_NUMERIC=C   # printf %.0f refuse « 4.76 » en locale française : jauges vides sinon
input=$(cat)


IFS='|' read -r cwd model style ctxp ctxin ctxsz cost durms la lr f5p f5r f7p f7r < <(jq -r '[
  (.workspace.current_dir // .cwd // ""), (.model.display_name // "Claude"), (.output_style.name // ""),
  (.context_window.used_percentage // ""), (.context_window.total_input_tokens // 0), (.context_window.context_window_size // 200000),
  (.cost.total_cost_usd // ""), (.cost.total_duration_ms // 0), (.cost.total_lines_added // 0), (.cost.total_lines_removed // 0),
  (.rate_limits.five_hour.used_percentage // ""), (.rate_limits.five_hour.resets_at // ""),
  (.rate_limits.seven_day.used_percentage // ""), (.rate_limits.seven_day.resets_at // "")
] | join("|")' <<<"$input")

now=$(date +%s)
cols=${COLUMNS:-160}
wide=1; [ "$cols" -lt 100 ] && wide=0

# ── palette ─────────────────────────────────────────────────────────
RST=$'\033[0m'; BOLD=$'\033[1m'
c() { printf '\033[38;5;%sm' "$1"; }
F=$(c 22); L=$(c 34); V=$(c 46); S=$(c 108); M=$(c 240); CY=$(c 51); Y=$(c 226); R=$(c 196); OR=$(c 208)
GRAD=(46 46 82 82 118 154 190 226 220 214 208 202 196)
SEP=" ${F}▍${RST} "

# ── helpers ─────────────────────────────────────────────────────────
gbar() { local pct=${1:-0} width=${2:-12} f i b="" idx
  f=$(printf "%.0f" "$(echo "scale=4; $pct/100*$width" | bc)")
  [ "$f" -gt "$width" ] && f=$width; [ "$f" -lt 0 ] && f=0
  for ((i=0;i<f;i++)); do idx=$(( i * ${#GRAD[@]} / width )); b+="$(c "${GRAD[$idx]}")█"; done
  b+="$(c 236)"; for ((i=f;i<width;i++)); do b+="░"; done
  printf "%s%s" "$b" "$RST"; }
col_for() { local p; p=$(printf "%.0f" "${1:-0}")
  if [ "$p" -ge 80 ]; then printf "%s" "$R"; elif [ "$p" -ge 50 ]; then printf "%s" "$Y"; else printf "%s" "$V"; fi; }
pct() { printf "%s%s%.0f%%%s" "$(col_for "$1")" "$BOLD" "$1" "$RST"; }
fmtk() { local n=${1:-0}
  if [ "$n" -ge 1000000 ]; then printf "%.1fM" "$(echo "scale=2;$n/1000000"|bc)" | sed 's/\.0M/M/'
  elif [ "$n" -ge 1000 ]; then printf "%.0fk" "$(echo "scale=2;$n/1000"|bc)"
  else printf "%d" "$n"; fi; }
dur() { local s=$1 d h m; d=$((s/86400)); h=$((s%86400/3600)); m=$((s%3600/60))
  if [ "$d" -gt 0 ]; then printf "%dj%02dh" "$d" "$h"; else printf "%dh%02d" "$h" "$m"; fi; }
jour() { case "$(date -r "$1" +%u)" in 1) printf lun;; 2) printf mar;; 3) printf mer;; 4) printf jeu;; 5) printf ven;; 6) printf sam;; 7) printf dim;; esac; }

# fenêtre glissante : jauge % ↻ restant → reset ◉ rythme
window() { # $1 label  $2 pct  $3 reset  $4 total(s)  $5 same_day(1 = heure seule)
  local label=$1 p=$2 reset=$3 total=$4 out left el pace tag when
  [ -z "$p" ] && { printf "%s%s %s--%s" "$L" "$label" "$M" "$RST"; return; }
  out="${L}${label}${RST} $(gbar "$p" 12) $(pct "$p")"
  if [ -n "$reset" ] && [ "$reset" -gt "$now" ]; then
    left=$(( reset - now )); el=$(( (total - left) * 100 / total ))
    if [ "$total" -le 18000 ]; then when="$(date -r "$reset" +%H:%M)"; else when="$(jour "$reset") $(date -r "$reset" +%H:%M)"; fi
    out+=" ${M}↻${RST} ${S}$(dur "$left")${RST}"
    [ "$wide" = 1 ] && out+=" ${M}→ ${when}${RST}"
    if [ "$el" -gt 2 ]; then
      pace=$(printf "%.0f" "$(echo "scale=2; $p*100/$el" | bc)")
      if   [ "$pace" -ge 120 ]; then tag="${R}◉ TROP VITE${RST}"
      elif [ "$pace" -ge 90  ]; then tag="${Y}◉ LIMITE${RST}"
      else tag="${V}◉ OK${RST}"; fi
      out+=" $tag"
    fi
  fi
  printf "%s" "$out"
}

# ── ligne 1 : session ───────────────────────────────────────────────
cwd="${cwd/#$HOME/~}"
l1="${L}▸${RST} ${S}${cwd}${RST}${SEP}${BOLD}${CY}${model}${RST}"
if [ -n "$ctxp" ]; then
  l1+="${SEP}${L}ctx${RST} $(gbar "$ctxp" 12) $(pct "$ctxp") ${M}$(fmtk "$ctxin")/$(fmtk "$ctxsz")${RST}"
else
  l1+="${SEP}${L}ctx${RST} ${M}--${RST}"
fi
if [ -n "$cost" ]; then
  l1+="${SEP}${V}\$$(printf "%.2f" "$cost")${RST} ${M}·${RST} ${S}$(dur $((durms/1000)))${RST}"
  [ "$wide" = 1 ] && l1+=" ${M}·${RST} ${V}+${la}${RST}${M}/${RST}${R}-${lr}${RST}"
fi

# ── ligne 2 : quotas ────────────────────────────────────────────────
l2="${Y}⚡${RST} $(window "5h" "$f5p" "$f5r" 18000)${SEP}$(window "7d" "$f7p" "$f7r" 604800)"

printf "%s\n%s" "$l1" "$l2"
