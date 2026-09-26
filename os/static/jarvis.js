// Jarvis : assistant vocal (OpenAI Realtime par WebRTC) branché sur OS KADANS.
// Orbe, session, cartes, rapport. Outils côté OS KADANS :
// send_to_terminal (écrit dans le chat Claude actif), read_terminal (lit ce que Claude affiche), open_app, open_url, display_card, display_report,
// et les outils en lecture seule de jarvis_outils.py (/jarvis/outil).
// Jarvis(racine, {terminal: () => id du chat actif})
window.Jarvis = function (racine, opts) {
  racine.innerHTML = '<div class="jv"><div class="jv-mode"><span class="chip" data-m="local" title="Tout sur le Mac : Whisper, Qwen, Kokoro. Gratuit, rien ne sort.">● Local</span><span class="chip" data-m="openai" title="OpenAI Realtime : plus rapide et plus naturel, payant, les données partent chez OpenAI">OpenAI</span></div><canvas class="orbe"></canvas><div class="etat">clique l’orbe pour <b>initialiser</b></div><div class="transcript"></div><form class="jv-ecrire"><input placeholder="ou écris ta question (Entrée)" autocomplete="off"></form><div class="cartes"></div><div class="rapport" hidden></div></div>';
  const orb = racine.querySelector('.orbe'), ctx = orb.getContext('2d'), etatEl = racine.querySelector('.etat'), trEl = racine.querySelector('.transcript'), cartes = racine.querySelector('.cartes'), rapport = racine.querySelector('.rapport');
  let pc = null, dc = null, mic = null, anIn = null, anOut = null, actif = false, t = 0, audioEl = null, muet = localStorage.getItem('jarvis-muet') === '1';
  let mode = 'local'; try { mode = localStorage.getItem('jarvis-mode') || 'local'; } catch (x) { }
  const loc = { ac: null, proc: null, phase: 'arret', morceaux: [], parle: false, silence: 0, voixMs: 0, bruit: 0.004, calib: 0, audio: null };
  function rendreMode() { racine.querySelectorAll('.jv-mode .chip').forEach(c => c.classList.toggle('on', c.dataset.m === mode)); racine.querySelector('.jv-ecrire').hidden = mode !== 'local'; }
  racine.querySelectorAll('.jv-mode .chip').forEach(c => c.onclick = () => { if (c.dataset.m === mode) return; arreter(); mode = c.dataset.m; try { localStorage.setItem('jarvis-mode', mode); } catch (x) { } rendreMode(); });
  rendreMode();
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const rgb = hex => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); };

  function taille() { const r = orb.getBoundingClientRect(); orb.width = r.width * devicePixelRatio; orb.height = r.height * devicePixelRatio; }
  new ResizeObserver(taille).observe(orb); taille();
  function niveau(a) { if (!a) return 0; const b = new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(b); let s = 0; for (const v of b) s += v; return s / b.length / 255; }
  const TAU = Math.PI * 2;
  function dessiner() {
    requestAnimationFrame(dessiner); if (orb.hidden || !orb.width) return;
    t += 0.016; const w = orb.width, h = orb.height, cx = w / 2, cy = h / 2, dpr = devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    const e = Math.max(niveau(anIn), niveau(anOut) * 1.3), base = Math.min(w, h) * 0.2, R = base * (1 + 0.14 * e + 0.012 * Math.sin(t * 2.1));
    const C = rgb(css('--ac2') || '#22d3ee'), A = rgb(css('--am') || '#ffb347'), fond = css('--bg') || '#04070a';
    let g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.6); g.addColorStop(0, `rgba(${C},${0.16 + e * 0.3})`); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 2.6, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.25);
    for (let i = 0; i < 12; i++) { const a0 = (i / 12) * TAU, a1 = a0 + TAU / 12 * 0.62; ctx.strokeStyle = `rgba(${C},${0.55 + 0.4 * Math.sin(t * 3 + i)})`; ctx.lineWidth = 7 * dpr; ctx.beginPath(); ctx.arc(0, 0, R * 1.55, a0, a1); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.1);
    for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU, big = i % 5 === 0; ctx.strokeStyle = `rgba(${big ? A : C},${big ? .8 : .3})`; ctx.lineWidth = (big ? 2 : 1) * dpr; const r0 = R * 1.78, r1 = R * (big ? 1.88 : 1.83); ctx.beginPath(); ctx.moveTo(r0 * Math.cos(a), r0 * Math.sin(a)); ctx.lineTo(r1 * Math.cos(a), r1 * Math.sin(a)); ctx.stroke(); }
    ctx.restore();
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (0.5 + i * 0.3) * (i % 2 ? -1 : 1)); ctx.strokeStyle = `rgba(${i === 1 ? A : C},${0.5 + e * 0.4})`; ctx.lineWidth = 2.2 * dpr; ctx.beginPath(); ctx.arc(0, 0, R * (1.18 + i * 0.13), 0, TAU * (0.16 + 0.1 * i)); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.06); ctx.strokeStyle = `rgba(${C},.45)`; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
    for (let i = 0; i <= 3; i++) { const a = (i / 3) * TAU - Math.PI / 2, x = R * 1.02 * Math.cos(a), y = R * 1.02 * Math.sin(a); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
    g = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R); g.addColorStop(0, 'rgba(255,255,255,.98)'); g.addColorStop(0.4, `rgba(${C},${0.9 + e * 0.1})`); g.addColorStop(1, fond);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, TAU); ctx.fill();
    if (e > 0.02) { ctx.strokeStyle = `rgba(255,255,255,${0.3 + e * 0.5})`; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); for (let a = 0; a <= TAU; a += 0.05) { const rr = R * (1 + 0.07 * e * Math.sin(a * 9 + t * 6)); const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a); a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.closePath(); ctx.stroke(); }
  }
  dessiner();

  // ── mode local : micro → détection de fin de phrase → /jarvis/local/tour (Whisper + Qwen + Kokoro sur le Mac) → voix
  async function demarrerLocal() {
    etatEl.innerHTML = '<b>chargement des modèles…</b> (première fois : ~15 s)';
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('micro indisponible dans cette fenêtre : ouvre /jarvis dans Chrome');
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const ac = new AudioContext(); loc.ac = ac; anIn = ac.createAnalyser(); anIn.fftSize = 256;
      const src = ac.createMediaStreamSource(mic); src.connect(anIn);
      const proc = ac.createScriptProcessor(4096, 1, 1); loc.proc = proc; src.connect(proc); proc.connect(ac.destination);
      proc.onaudioprocess = ev => ecouter(ev.inputBuffer.getChannelData(0), ac.sampleRate);
      actif = true; racine.classList.add('actif');
      const r = await fetch('/jarvis/local/prechauffer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur || ('HTTP ' + r.status));
      if (actif) ecoute();
    } catch (x) { etatEl.innerHTML = '<b class="err">erreur</b> · ' + esc((x.name ? x.name + ' : ' : '') + x.message) + (x.name === 'NotAllowedError' ? ' · Réglages Système › Confidentialité › Microphone' : ''); arreter(true); }
  }
  function ecoute() { loc.phase = 'ecoute'; loc.morceaux = []; loc.parle = false; loc.silence = 0; loc.voixMs = 0; loc.calib = 0; etatEl.innerHTML = '<b>j’écoute</b> · local, rien ne sort du Mac'; }
  function ecouter(buf, sr) {
    if (loc.phase !== 'ecoute') return;
    let e = 0; for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i]; const rms = Math.sqrt(e / buf.length), ms = buf.length / sr * 1000;
    if (loc.calib < 300) { loc.calib += ms; loc.bruit = Math.max(0.003, loc.bruit * 0.7 + rms * 0.3); return; }     // bruit de fond
    const seuil = Math.max(0.012, loc.bruit * 3);
    const f = new Float32Array(buf); loc.morceaux.push({ f, sr });
    if (rms > seuil) { loc.voixMs += ms; loc.silence = 0; if (loc.voixMs > 150) loc.parle = true; }
    else { loc.silence += ms; if (!loc.parle) { loc.bruit = loc.bruit * 0.95 + rms * 0.05; if (loc.morceaux.length > 4) loc.morceaux.shift(); } }
    const duree = loc.morceaux.length * ms;
    if (loc.parle && (loc.silence > 900 || duree > 25000)) envoyerTour();
  }
  function en16k(morceaux) {
    const sr = morceaux[0].sr, n = morceaux.reduce((a, m) => a + m.f.length, 0), tout = new Float32Array(n); let o = 0;
    for (const m of morceaux) { tout.set(m.f, o); o += m.f.length; }
    const r = sr / 16000, out = new Float32Array(Math.floor(n / r));
    for (let i = 0; i < out.length; i++) { const x = i * r, a = Math.floor(x), b = Math.min(a + 1, n - 1); out[i] = tout[a] + (tout[b] - tout[a]) * (x - a); }
    return out;
  }
  async function envoyerTour(texte) {
    const corps = texte != null ? JSON.stringify({ texte }) : en16k(loc.morceaux).buffer;
    loc.phase = 'reflexion'; etatEl.innerHTML = '<b>réflexion…</b>'; trEl.textContent = '';
    try {
      const term = opts.terminal ? opts.terminal() : '';
      const r = await fetch('/jarvis/local/tour?terminal=' + encodeURIComponent(term || ''), { method: 'POST', headers: { 'Content-Type': texte != null ? 'application/json' : 'application/octet-stream' }, body: corps });
      const d = await r.json(); if (!r.ok) throw new Error(d.erreur || ('HTTP ' + r.status));
      if (!d.vous) { if (actif) ecoute(); else etatEl.innerHTML = 'clique l’orbe pour <b>initialiser</b>'; return; }
      carte('Vous', d.vous, 'info'); (d.cartes || []).forEach(c => carte(c.titre, c.contenu, 'result'));
      trEl.textContent = d.reponse; if (muet || !d.audio) carte('Jarvis', d.reponse, 'result');
      if (d.audio && !muet) await jouer(d.audio);
    } catch (x) { carte('Erreur', String(x.message || x), 'warning'); }
    if (actif) ecoute(); else etatEl.innerHTML = 'clique l’orbe pour <b>initialiser</b>';
  }
  function jouer(b64) {
    return new Promise(ok => {
      loc.phase = 'parle'; etatEl.innerHTML = '<b>jarvis parle</b> · clique l’orbe pour couper';
      const a = new Audio('data:audio/wav;base64,' + b64); loc.audio = a;
      try { const ac = loc.ac || new AudioContext(); loc.ac = ac; anOut = ac.createAnalyser(); anOut.fftSize = 256; const s = ac.createMediaElementSource(a); s.connect(anOut); anOut.connect(ac.destination); } catch (x) { }
      a.onended = a.onerror = a.onpause = () => { loc.audio = null; anOut = null; ok(); };
      a.play().catch(() => ok());
    });
  }
  racine.querySelector('.jv-ecrire').addEventListener('submit', ev => {
    ev.preventDefault(); const i = ev.target.querySelector('input'), v = i.value.trim(); if (!v || loc.phase === 'reflexion') return;
    i.value = ''; if (loc.audio) loc.audio.pause(); envoyerTour(v);
  });

  async function demarrer() {
    if (mode === 'local' && loc.audio) { loc.audio.pause(); return; }      // clic pendant qu'il parle : on coupe la voix seulement
    if (actif) return arreter();
    if (mode === 'local') return demarrerLocal();
    etatEl.innerHTML = '<b>connexion…</b>';
    try {
      const sess = await fetch('/jarvis/session', { method: 'POST' }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.erreur || r.status); return d; });
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('micro indisponible dans cette fenêtre : ouvre /jarvis dans Chrome');
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new AudioContext(); anIn = ac.createAnalyser(); anIn.fftSize = 256; ac.createMediaStreamSource(mic).connect(anIn);
      pc = new RTCPeerConnection(); mic.getTracks().forEach(tr => pc.addTrack(tr, mic));
      pc.ontrack = ev => { const a = new Audio(); audioEl = a; a.muted = muet; a.srcObject = ev.streams[0]; a.play(); anOut = ac.createAnalyser(); anOut.fftSize = 256; ac.createMediaStreamSource(ev.streams[0]).connect(anOut); };
      dc = pc.createDataChannel('oai-events'); dc.onmessage = ev => traiter(JSON.parse(ev.data));
      const offre = await pc.createOffer(); await pc.setLocalDescription(offre);
      const sdp = await fetch('https://api.openai.com/v1/realtime/calls?model=' + sess.model, { method: 'POST', headers: { Authorization: 'Bearer ' + sess.client_secret, 'Content-Type': 'application/sdp' }, body: offre.sdp })
        .then(async r => { const b = await r.text(); if (!r.ok) throw new Error('OpenAI ' + r.status + ' : ' + b.slice(0, 200)); return b; });
      await pc.setRemoteDescription({ type: 'answer', sdp });
      actif = true; racine.classList.add('actif'); afficherEtat(); if (muet) { if (dc.readyState === 'open') silence(true); else dc.onopen = () => silence(true); }
    } catch (x) { etatEl.innerHTML = '<b class="err">erreur</b> · ' + esc((x.name ? x.name + ' : ' : '') + x.message) + (x.name === 'NotAllowedError' ? ' · vérifie Réglages Système › Confidentialité › Microphone › OS KADANS, ou bouton Chrome' : ''); arreter(true); }
  }
  function arreter(silencieux) {
    if (loc.proc) { try { loc.proc.disconnect(); } catch (x) { } loc.proc = null; } if (loc.audio) loc.audio.pause(); loc.phase = 'arret';
    if (pc) pc.close(); pc = null; dc = null; if (mic) mic.getTracks().forEach(tr => tr.stop()); mic = null; anIn = anOut = null; actif = false; racine.classList.remove('actif');
    if (!silencieux) etatEl.innerHTML = 'clique l’orbe pour <b>initialiser</b>';
  }
  function afficherEtat() { if (actif && mode === 'local') return; if (actif) etatEl.innerHTML = muet ? '<b>en ligne</b> · silencieux, réponses écrites' : '<b>en ligne</b> · à votre service'; }
  // silence : plus de voix, Jarvis répond par écrit (transcript et cartes) ; « reste silencieux » / « reparle » à la voix, ou le bouton Muet
  function silence(on) {
    muet = !!on; localStorage.setItem('jarvis-muet', muet ? '1' : '0'); if (audioEl) audioEl.muted = muet; if (muet && loc.audio) loc.audio.pause();
    envoyer({ type: 'session.update', session: { type: 'realtime', output_modalities: [muet ? 'text' : 'audio'] } });
    afficherEtat(); if (opts.surSilence) opts.surSilence(muet);
  }
  orb.addEventListener('click', demarrer);
  const envoyer = o => { if (dc && dc.readyState === 'open') dc.send(JSON.stringify(o)); };
  const retour = (id, o) => { envoyer({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: id, output: JSON.stringify(o) } }); envoyer({ type: 'response.create' }); };
  const post = (c, d) => fetch(c, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json());

  // outils en lecture seule exécutés par le serveur (vitrine/jarvis_outils.py)
  const LECTURE = { obsidian_search: 'recherche Obsidian', obsidian_read: 'lecture de la note', };
  async function traiter(ev) {
    if (ev.type === 'response.output_audio_transcript.delta' || ev.type === 'response.audio_transcript.delta') { trEl.textContent = (trEl.dataset.cur || '') + ev.delta; trEl.dataset.cur = trEl.textContent; }
    if (ev.type === 'response.output_text.delta' || ev.type === 'response.text.delta') { trEl.textContent = (trEl.dataset.cur || '') + ev.delta; trEl.dataset.cur = trEl.textContent; }
    if (ev.type === 'response.done') { if (muet && trEl.textContent) carte('Jarvis', trEl.textContent, 'result'); trEl.dataset.cur = ''; }
    if (ev.type === 'conversation.item.input_audio_transcription.completed' && ev.transcript) carte('Vous', ev.transcript, 'info');
    if (ev.type !== 'response.function_call_arguments.done') return;
    let a = {}; try { a = JSON.parse(ev.arguments || '{}'); } catch (x) { }
    try {
      if (ev.name === 'send_to_terminal') { carte('→ Chat Claude', a.text || '', 'result'); retour(ev.call_id, await post('/jarvis/chat', { text: a.text || '', terminal: opts.terminal ? opts.terminal() : null })); }
      else if (ev.name === 'read_terminal') { const d = await fetch('/jarvis/lire?terminal=' + encodeURIComponent((opts.terminal && opts.terminal()) || '')).then(r => r.json()); retour(ev.call_id, { text: (d.texte || '').slice(-3500) || '(chat vide)' }); }
      else if (ev.name === 'open_app') { carte('Lancement', 'Ouverture de **' + (a.name || '') + '**', 'info'); retour(ev.call_id, await post('/jarvis/ouvrir', { name: a.name || '' })); }
      else if (ev.name === 'open_url') { carte('Lancement', 'Ouverture de **' + (a.url || '') + '**', 'info'); retour(ev.call_id, await post('/jarvis/ouvrir', { url: a.url || '' })); }
      else if (ev.name === 'display_card') { carte(a.title || 'Info', a.content || '', a.kind || 'info'); retour(ev.call_id, { status: 'displayed' }); }
      else if (ev.name === 'display_report') { montrerRapport(a); retour(ev.call_id, { status: 'displayed' }); }
      else if (LECTURE[ev.name]) { etatEl.innerHTML = '<b>' + LECTURE[ev.name] + '…</b>'; const r = await post('/jarvis/outil', { name: ev.name, args: a }); afficherEtat(); retour(ev.call_id, r); }
      else if (ev.name === 'set_silent') { silence(a.silent !== false); retour(ev.call_id, { status: 'ok', silent: muet }); }
      else retour(ev.call_id, { status: 'error', error: 'outil inconnu' });
    } catch (x) { retour(ev.call_id, { status: 'error', error: String(x) }); }
  }
  function md(s) {
    let h = esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>'); let out = '', li = false;
    for (const l of h.split('\n')) { if (l.startsWith('- ')) { if (!li) { out += '<ul>'; li = true; } out += '<li>' + l.slice(2) + '</li>'; } else { if (li) { out += '</ul>'; li = false; } out += l + '\n'; } }
    return out + (li ? '</ul>' : '');
  }
  function carte(titre, contenu, genre) {
    const el = document.createElement('div'); el.className = 'carte ' + genre;
    el.innerHTML = '<h3><span>' + esc(titre) + '</span><span class="x">✕</span></h3><div class="corps">' + md(contenu) + '</div>';
    el.querySelector('.x').onclick = () => el.remove(); cartes.prepend(el); while (cartes.children.length > 8) cartes.lastChild.remove();
  }
  function montrerRapport(r) {
    let h = '<div class="rtete"><h2>' + esc(r.title || 'Rapport') + '</h2><span class="x">✕</span></div>';
    if (r.kpis && r.kpis.length) h += '<div class="kpis">' + r.kpis.slice(0, 4).map(k => '<div class="kpi"><div class="l">' + esc(k.label) + '</div><div class="v">' + esc(k.value) + '</div>' + (k.delta ? '<div class="d' + (String(k.delta).trim().startsWith('-') ? ' neg' : '') + '">' + esc(k.delta) + '</div>' : '') + '</div>').join('') + '</div>';
    if (r.table && r.table.rows && r.table.rows.length) h += '<table><thead><tr>' + (r.table.columns || []).map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + r.table.rows.map(l => '<tr>' + l.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    if (r.markdown) h += '<div class="rmd">' + md(r.markdown) + '</div>';
    rapport.innerHTML = h; rapport.hidden = false; rapport.querySelector('.x').onclick = () => rapport.hidden = true;
  }
  return { demarrer, arreter, actif: () => actif, silence, muet: () => muet };
};
