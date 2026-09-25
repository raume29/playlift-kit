// Moniteur : ce que fait Claude en direct (hooks PreToolUse / PostToolUse / UserPromptSubmit / Stop → POST /activite).
// Utilisé dans le panneau de droite de la page principale et dans la fenêtre à part (/moniteur).
// Moniteur(racine, {filtre: () => id de chat | null (tous), noms: () => {id: titre}})
window.Moniteur = function (racine, opts) {
  const evts = new Map(); let ordre = []; let depuis = 0; let choix = null; let suivre = true; let cleFlux = ''; let cleFocus = '';
  racine.innerHTML = '<div class="mon"><div class="focus"><div class="vide">En attente d’une action de Claude</div></div><div class="flux"><div class="rien">Aucune activité<br>Les actions de Claude (commandes, lectures, recherches web) défilent ici</div></div></div>';
  const focus = racine.querySelector('.focus'), flux = racine.querySelector('.flux');
  flux.addEventListener('scroll', () => { suivre = flux.scrollTop + flux.clientHeight >= flux.scrollHeight - 30; });

  const OUTILS = {
    Bash: ['>_', 'commande'], Read: ['≡', 'lecture'], Edit: ['✎', 'modification'], Write: ['✎', 'écriture'], NotebookEdit: ['✎', 'notebook'],
    Grep: ['⌕', 'recherche texte'], Glob: ['⌕', 'recherche fichiers'], WebSearch: ['◎', 'recherche web'], WebFetch: ['⇣', 'lecture web'],
    Agent: ['⧉', 'agent'], Skill: ['★', 'skill'], Artifact: ['◫', 'artefact'], AskUserQuestion: ['?', 'question'], TodoWrite: ['☑', 'tâches'],
    Workflow: ['⛓', 'workflow'], EnterPlanMode: ['◇', 'plan'], ExitPlanMode: ['◆', 'plan']
  };
  function meta(e) {
    if (e.type === 'prompt') return ['▶', 'prompt'];
    if (e.type === 'stop') return ['■', 'réponse terminée'];
    const o = e.outil || '';
    if (OUTILS[o]) return OUTILS[o];
    if (o.startsWith('mcp__claude-in-chrome__')) return ['▣', 'chrome · ' + o.slice(23).replace(/_mcp$/, '').replace(/_/g, ' ')];
    if (o.startsWith('mcp__')) { const p = o.slice(5).split('__'); return ['⌬', (p[0] || '').replace(/^claude_ai_/, '').replace(/_/g, ' ') + ' · ' + (p[1] || '').replace(/_/g, ' ')]; }
    return ['●', o.toLowerCase()];
  }
  const web = e => /^(WebSearch|WebFetch|Agent|mcp__claude-in-chrome__)/.test(e.outil || '');
  const heure = t => new Date(t * 1000).toTimeString().slice(0, 8);
  const duree = e => e.duree == null ? (e.etat === 'en cours' ? Math.max(0, (Date.now() / 1000 - e.t)).toFixed(0) + 's…' : '') : (e.duree < 10 ? e.duree.toFixed(1) : Math.round(e.duree)) + 's';
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  async function tirer() {
    try {
      const r = await fetch('/activite?depuis=' + depuis); const d = await r.json();
      for (const e of d.evenements || []) { if (!evts.has(e.n)) ordre.push(e.n); evts.set(e.n, e); depuis = Math.max(depuis, e.maj || e.n); }
      if (ordre.length > 600) { for (const n of ordre.splice(0, ordre.length - 600)) evts.delete(n); }
    } catch (x) { }
    rendre();
    setTimeout(tirer, 600);
  }
  function visibles() { const f = opts.filtre ? opts.filtre() : null; return ordre.map(n => evts.get(n)).filter(e => e && (f === null || f === undefined || e.terminal === f)); }
  function courant(liste) {
    if (choix !== null) { const c = evts.get(choix); if (c && liste.includes(c)) return c; choix = null; }
    for (let i = liste.length - 1; i >= 0; i--) if (liste[i].type !== 'stop') return liste[i];
    return null;
  }
  function rendre() {
    const liste = visibles(); const noms = opts.noms ? opts.noms() : {}; const tous = !(opts.filtre && opts.filtre() != null);
    const c = courant(liste);
    const cle = JSON.stringify(liste.slice(-200).map(e => [e.n, e.maj, e.etat, tous ? noms[e.terminal] : '', c && c.n, e.etat === 'en cours' ? Math.round(Date.now() / 1000 - e.t) : 0]));
    if (cle !== cleFlux) {
      cleFlux = cle; flux.innerHTML = '';
      if (!liste.length) flux.innerHTML = '<div class="rien">Aucune activité<br>Les actions de Claude (commandes, lectures, recherches web) défilent ici</div>';
      for (const e of liste.slice(-200)) {
        const [ic, lab] = meta(e); const d = document.createElement('div');
        d.className = 'ev ' + (e.type === 'prompt' ? 'prompt' : e.type === 'stop' ? 'stop' : e.etat === 'en cours' ? 'cours' : e.etat === 'erreur' ? 'err' : '') + (web(e) ? ' web' : '') + (c && c.n === e.n ? ' on' : '');
        const qui = tous && noms[e.terminal] ? '<span class="qui">' + esc(noms[e.terminal]) + '</span>' : '';
        d.innerHTML = '<span class="h">' + heure(e.t) + '</span><span class="i">' + ic + '</span><span class="r">' + qui + '<span class="o">' + esc(lab) + '</span>' + esc(e.type === 'prompt' ? e.texte : e.type === 'stop' ? '' : e.resume) + '</span><span class="s">' + (e.type === 'outil' ? duree(e) : '') + '</span>';
        d.onclick = () => { choix = e.n; suivre = false; rendre(); };
        flux.appendChild(d);
      }
      if (suivre) flux.scrollTop = flux.scrollHeight;
    }
    const cf = c ? JSON.stringify([c.n, c.maj, c.etat, c.cadre, c.etat === 'en cours' ? Math.round(Date.now() / 1000 - c.t) : 0]) : '';
    if (cf !== cleFocus) { cleFocus = cf; rendreFocus(c); }
    if (opts.etat) opts.etat(liste.some(e => e.type === 'outil' && e.etat === 'en cours'), liste.length);
  }
  function rendreFocus(e) {
    if (!e) { focus.innerHTML = '<div class="vide">En attente d’une action de Claude</div>'; return; }
    const [ic, lab] = meta(e); const det = e.detail || {};
    let st = ''; if (e.type === 'outil') st = e.etat === 'en cours' ? '<span class="st cours">● en cours ' + duree(e) + '</span>' : e.etat === 'erreur' ? '<span class="st err">✕ erreur ' + duree(e) + '</span>' : '<span class="st ok">✓ ' + duree(e) + '</span>';
    let gros = e.type === 'prompt' ? '<div class="gros prompt">' + esc(e.texte) + '</div>' : '<div class="gros">' + esc(e.resume) + '</div>';
    let ap = '';
    const o = e.outil || '';
    const url = det.url || (o === 'mcp__claude-in-chrome__navigate' ? det.url : null);
    if (url && /^https?:/.test(url) && e.cadre !== false) ap = '<iframe src="' + esc(url) + '" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>';
    else if (url) ap = '<pre>' + esc(url) + '\n\n(ce site refuse l’aperçu)' + (e.sortie ? '\n\n' + esc(e.sortie) : '') + '</pre>';
    else if (o === 'Edit') ap = '<pre><span class="del">' + esc(det.avant || '') + '</span><span class="add">' + esc(det.apres || '') + '</span></pre>';
    else if (o === 'Write') ap = '<pre>' + esc(det.contenu || '') + '</pre>';
    else if (o === 'Read' && det.chemin) { ap = '<pre data-chemin="' + esc(det.chemin) + '">…</pre>'; chargerTexte(det.chemin); }
    else if (o === 'Bash') ap = '<pre>$ ' + esc(det.commande || '') + (e.sortie ? '\n\n' + esc(e.sortie) : (e.etat === 'en cours' ? '\n\n…' : '')) + '</pre>';
    else if (o === 'Agent' || o === 'Skill') ap = '<pre>' + esc(det.prompt || det.args || '') + (e.sortie ? '\n\n' + esc(e.sortie) : '') + '</pre>';
    else if (e.sortie) ap = '<pre>' + esc(e.sortie) + '</pre>';
    else if (e.type === 'outil' && Object.keys(det).length) ap = '<pre>' + esc(Object.entries(det).map(([k, v]) => k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')) + '</pre>';
    focus.innerHTML = '<div class="lab"><span class="ic">' + ic + '</span><span>' + esc(lab) + '</span>' + st + '</div>' + gros + (ap ? '<div class="apercu">' + ap + '</div>' : '');
  }
  async function chargerTexte(chemin) {
    try { const r = await fetch('/texte?chemin=' + encodeURIComponent(chemin)); const d = await r.json(); const p = focus.querySelector('pre[data-chemin]'); if (p && p.dataset.chemin === chemin) p.textContent = d.texte || d.erreur || ''; } catch (x) { }
  }
  tirer();
  return { rendre, suivre: () => { choix = null; suivre = true; rendre(); } };
};
