// OS KADANS · page principale. Livrables par chat, terminaux (xterm + pty), moniteur, fenêtres.
const PORT_WS=parseInt(document.body.dataset.ws);
const PARAMS=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
// ── effets (scanlines, halos) : FX dans le HUD ──
function fx(on){document.body.classList.toggle('fx',on);$('bfx').classList.toggle('on',on);localStorage.setItem('fx',on?'1':'0');}
fx(localStorage.getItem('fx')!=='0');
$('bfx').onclick=()=>fx(!document.body.classList.contains('fx'));
// ── Espace (⚙, ⌘,) : thème, mode, accent, polices, tailles, densité, effets. Moteur et catalogue : static/theme.js ──
const E=window.ESPACE;
const THEMES=E.THEMES,POLICES=E.POLICES,TAILLES=E.TAILLES;
const H=document.documentElement;
const reg=E.lire();
function appliquerReglages(){
  E.appliquer(reg);E.ecrire(reg);
  majModeBouton();
  for(const k in terms){const t=terms[k];t.term.options.theme=themeXterm();t.term.options.fontFamily=reg.police;t.term.options.fontSize=reg.taille;ajusterUn(t,true);}
  ajuster();
  if(!$('reglages').hidden){placerReglages();rendreReglages();}
}
// un changement venu d'une autre fenêtre OS KADANS ou du mode auto qui suit le système
document.addEventListener('espace',()=>{Object.assign(reg,E.lire());majModeBouton();
  for(const k in terms){const t=terms[k];t.term.options.theme=themeXterm();t.term.options.fontFamily=reg.police;t.term.options.fontSize=reg.taille;ajusterUn(t,true);}
  if(!$('reglages').hidden)rendreReglages();});
function majModeBouton(){const b=$('bmode');if(!b)return;const clair=H.dataset.mode==='light';
  b.textContent=reg.mode==='auto'?'◐':clair?'☀':'☾';b.title=(reg.mode==='auto'?'Mode auto (suit le système) · ':'')+'Clic : passer en '+(clair?'sombre':'clair');}
function cssv(n){return getComputedStyle(H).getPropertyValue(n).trim();}
// une couleur CSS (#rgb, #rrggbb, rgb()) avec une transparence, pour xterm qui ne lit pas color-mix
function alpha(c,a){c=(c||'').trim();let r=128,g=128,b=128;
  if(c[0]==='#'){let h=c.slice(1);if(h.length===3)h=h.replace(/./g,x=>x+x);const n=parseInt(h.slice(0,6),16);r=n>>16&255;g=n>>8&255;b=n&255;}
  else{const m=c.match(/\d+(\.\d+)?/g);if(m)[r,g,b]=m.slice(0,3).map(Number);}
  return `rgba(${r},${g},${b},${a})`;}
function themeXterm(){
  const clair=H.dataset.mode==='light';
  const ansi=clair?{black:'#1f2933',red:'#c62828',green:'#0a7f45',yellow:'#9a6700',blue:'#1d4ed8',magenta:'#7e22ce',cyan:'#0e7490',white:'#52606d',
    brightBlack:'#7b8794',brightRed:'#d32f2f',brightGreen:'#0a9f5a',brightYellow:'#b45309',brightBlue:'#2563eb',brightMagenta:'#9333ea',brightCyan:'#0891b2',brightWhite:'#1f2933'}
   :{black:'#0d151d',red:'#ff4d6d',green:'#39ff88',yellow:'#ffd166',blue:'#58a6ff',magenta:'#c084fc',cyan:'#22d3ee',white:'#d9e3ea',
    brightBlack:'#4c6070',brightRed:'#ff6b85',brightGreen:'#6dffa6',brightYellow:'#ffe08a',brightBlue:'#7cbaff',brightMagenta:'#d3a4ff',brightCyan:'#67e3f5',brightWhite:'#ffffff'};
  return Object.assign({background:cssv('--bg'),foreground:cssv('--tx'),cursor:cssv('--ac'),cursorAccent:cssv('--bg'),selectionBackground:alpha(cssv('--ac'),clair?.22:.28),selectionInactiveBackground:alpha(cssv('--tx3'),.25)},ansi);
}
function puce(txt,on,clic,titre){const e=document.createElement('span');e.className='th'+(on?' on':'');e.textContent=txt;if(titre)e.title=titre;e.onclick=clic;return e;}
function section(titre,valeur){const s=document.createElement('div');s.className='e-sec';const l=document.createElement('div');l.className='e-l';l.textContent=titre;
  if(valeur){const v=document.createElement('span');v.className='e-v';v.textContent=valeur;l.appendChild(v);}s.appendChild(l);return s;}
function groupe(cls){const g=document.createElement('div');g.className='grp'+(cls?' '+cls:'');return g;}
function rendreReglages(){
  const r=$('reglages');r.innerHTML='';
  const tete=document.createElement('div');tete.className='e-tete';
  tete.innerHTML='<b>ESPACE</b><span class="e-sous">ton poste, à ton goût</span><span class="e-raz" title="Revenir aux réglages d’origine">Réinitialiser</span><span class="e-x" title="Fermer (Échap)">✕</span>';
  tete.querySelector('.e-raz').onclick=()=>{Object.assign(reg,E.DEFAUT);fx(true);if(window.ambiance)window.ambiance(true);appliquerReglages();};
  tete.querySelector('.e-x').onclick=()=>basculerReglages();
  r.appendChild(tete);
  // mode
  let s=section('Mode',reg.mode==='auto'?(H.dataset.mode==='light'?'clair en ce moment':'sombre en ce moment'):'');let g=groupe('e-seg');
  for(const [v,n] of [['dark','☾ Sombre'],['light','☀ Clair'],['auto','◐ Auto']])g.appendChild(puce(n,reg.mode===v,()=>{reg.mode=v;appliquerReglages();},v==='auto'?'Suit le réglage clair / sombre du Mac':''));
  s.appendChild(g);r.appendChild(s);
  // thème
  s=section('Thème');g=groupe('e-themes');
  for(const [id,nom] of THEMES){const p=E.VIGNETTES[id][H.dataset.mode==='light'?1:0];const e=document.createElement('span');e.className='th e-theme'+(reg.theme===id?' on':'');
    e.innerHTML='<span class="e-vig" style="background:'+p[0]+'"><b style="background:'+p[1]+'"></b><i style="background:'+p[2]+'"></i><i style="background:'+p[3]+'"></i></span>'+nom;
    e.onclick=()=>{reg.theme=id;appliquerReglages();};g.appendChild(e);}
  s.appendChild(g);r.appendChild(s);
  // accent
  s=section('Accent',reg.accent?reg.accent.toUpperCase():'celui du thème');const a=document.createElement('div');a.className='e-acc';
  a.appendChild(puce('Du thème',!reg.accent,()=>{reg.accent='';appliquerReglages();}));
  for(const [c,n] of E.ACCENTS){const e=document.createElement('span');e.className='e-pas'+(reg.accent.toLowerCase()===c.toLowerCase()?' on':'');e.style.background=c;e.title=n;e.onclick=()=>{reg.accent=c;appliquerReglages();};a.appendChild(e);}
  const libre=document.createElement('label');const perso=reg.accent&&!E.ACCENTS.some(x=>x[0].toLowerCase()===reg.accent.toLowerCase());
  libre.className='e-pas e-libre'+(perso?' on':'');libre.title='Couleur libre';
  const ic=document.createElement('input');ic.type='color';ic.value=reg.accent||'#3b82f6';ic.oninput=()=>{reg.accent=ic.value;E.appliquer(reg);E.ecrire(reg);};ic.onchange=()=>{reg.accent=ic.value;appliquerReglages();};
  libre.appendChild(ic);a.appendChild(libre);s.appendChild(a);r.appendChild(s);
  // polices
  s=section('Police du texte');g=groupe();
  for(const [pile,nom] of E.TEXTES){const e=puce(nom,reg.police_texte===pile,()=>{reg.police_texte=pile;appliquerReglages();});e.classList.add('police');e.style.fontFamily=pile||reg.police;g.appendChild(e);}
  s.appendChild(g);r.appendChild(s);
  s=section('Police mono','terminal et libellés');g=groupe();
  for(const [nom,pile] of POLICES){const e=puce(nom,reg.police===pile,()=>{reg.police=pile;appliquerReglages();});e.classList.add('police');e.style.fontFamily=pile;g.appendChild(e);}
  s.appendChild(g);r.appendChild(s);
  // tailles
  s=section('Taille');
  let l=document.createElement('div');l.className='e-ligne';l.innerHTML='<span class="e-k">Interface</span>';g=groupe('e-seg');g.style.flex='1';
  for(const n of E.ZOOMS)g.appendChild(puce(n+' %',reg.zoom===n,()=>{reg.zoom=n;appliquerReglages();}));l.appendChild(g);s.appendChild(l);
  l=document.createElement('div');l.className='e-ligne';l.innerHTML='<span class="e-k">Terminal</span>';g=groupe('e-seg');g.style.flex='1';
  for(const n of TAILLES)g.appendChild(puce(String(n),reg.taille===n,()=>{reg.taille=n;appliquerReglages();}));l.appendChild(g);s.appendChild(l);r.appendChild(s);
  // densité
  s=section('Densité');g=groupe('e-seg');
  for(const [v,n] of [['confort','Confort'],['compacte','Compacte']])g.appendChild(puce(n,reg.densite===v,()=>{reg.densite=v;appliquerReglages();}));
  s.appendChild(g);r.appendChild(s);
  // effets
  s=section('Effets');
  l=document.createElement('div');l.className='e-ligne';l.innerHTML='<span class="e-k">FX</span>';g=groupe('e-seg');g.style.flex='1';const fxOn=document.body.classList.contains('fx');
  for(const [v,n] of [[true,'on'],[false,'off']])g.appendChild(puce(n,fxOn===v,()=>{fx(v);rendreReglages();},'Scanlines et halos'));l.appendChild(g);s.appendChild(l);
  if(window.ambiance){l=document.createElement('div');l.className='e-ligne';l.innerHTML='<span class="e-k">Fond animé</span>';g=groupe('e-seg');g.style.flex='1';
    for(const [v,n] of [[true,'on'],[false,'off']])g.appendChild(puce(n,window.ambiance()===v,()=>{window.ambiance(v);rendreReglages();},'Animation de focus derrière les livrables'));l.appendChild(g);s.appendChild(l);}
  r.appendChild(s);
}
function basculerMode(){reg.mode=H.dataset.mode==='light'?'dark':'light';appliquerReglages();}
function placerReglages(){const r=$('reglages'),h=$('hud').getBoundingClientRect();r.style.top=Math.round(h.bottom+4)+'px';}
function basculerReglages(){const r=$('reglages');r.hidden=!r.hidden;$('breg').classList.toggle('on',!r.hidden);if(!r.hidden){placerReglages();rendreReglages();}}
document.addEventListener('mousedown',e=>{const r=$('reglages');if(!r.hidden&&!r.contains(e.target)&&!$('breg').contains(e.target))basculerReglages();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('reglages').hidden){basculerReglages();e.preventDefault();e.stopPropagation();}},true);
$('breg').title='Espace : thème, mode, accent, polices, taille, densité (⌘,)';
majModeBouton();   // thème, mode et polices sont déjà posés par theme.js ; les terminaux prennent les leurs à leur création
// ── Jarvis : panneau flottant (⇧⌘V) ──
let jarvis=null;
function basculerJarvis(){const j=$('jarvis');j.hidden=!j.hidden;$('bjar').classList.toggle('on2',!j.hidden);localStorage.setItem('jarvis',j.hidden?'0':'1');
  if(!j.hidden&&!jarvis){jarvis=Jarvis($('jv-corps'),{terminal:()=>actif,surSilence:m=>$('jv-muet').classList.toggle('on',m)});$('jv-muet').classList.toggle('on',jarvis.muet());}}
if(localStorage.getItem('jarvis')==='1')basculerJarvis();
setInterval(()=>{$('horloge').textContent=new Date().toTimeString().slice(0,8);},500);
// ── livrables : seulement ceux du chat actif, jamais ceux des autres chats ──
let histo=[], courants={}, cleLivr='', srcCadre=null, ratés=0, serveur={};
let vus=null;   // ids déjà vus : un livrable arrivé dans un autre chat met un point sur son onglet
$('haut').style.height=localStorage.getItem('h')||'45%';
if(localStorage.getItem('plie')==='1')plier(true);
async function etat(){
  try{const r=await fetch('/etat');rendre(await r.json());ratés=0;$('hors').style.display='none';}
  catch(x){ratés++;if(ratés>3)$('hors').style.display='';}
  setTimeout(etat,1000);
}
function rendre(e){
  serveur=e;histo=e.histo||[];courants=e.courants||{};
  if(vus===null)vus=new Set(histo.map(h=>h.id));
  rendreTerms((e.terminaux||[]).filter(t=>(t.fen||'0')===FEN));      // fixe `actif` avant de filtrer les livrables
  rendreLivrables();
  rendreHud(e);
}
function rendreHud(e){
  const n=(e.terminaux||[]).length, ia=(e.terminaux||[]).filter(t=>t.claude).length;
  $('s-chats').textContent=String(n).padStart(2,'0');$('s-ia').textContent=String(ia).padStart(2,'0');
  $('s-charge').textContent=(e.charge!=null?e.charge.toFixed(2):'·');
  majCerveau(e.cerveau);
  const a=e.activite||{};const st=$('s-act');st.classList.toggle('live',!!a.en_cours);
  $('s-act-v').textContent=a.en_cours?'TRAVAIL':'REPOS';
  $('bfen').classList.toggle('on2',!!e.moniteur_fenetre);
  if(e.moniteur_fenetre&&!$('moniteur').hidden&&!moniteurForce)montrerMoniteur(false);   // la fenêtre à part remplace le panneau
  $('bauto').classList.toggle('on',!!e.moniteur_auto);
}
function affiche(){
  const id=courants[actif];return histo.find(h=>h.id===id&&h.terminal===actif)||null;
}
function titreTerm(tid){const t=terms[tid];const s=listeServeur.find(x=>x.id===tid);
  if(!s)return 'chat fermé';return (s.nom||(t&&t.titre)||s.titre||('Terminal '+tid)).replace(/^[✳✶✻✽●○◐◑◒◓⚡]\s*/,'').slice(0,18);}
function rendreLivrables(){
  const liste=histo.filter(h=>h.terminal===actif);
  const a=affiche();
  let nouveau=false;
  for(const h of histo)if(h.terminal===actif&&!vus.has(h.id)){vus.add(h.id);nouveau=true;}
  const cle=JSON.stringify([liste.map(h=>[h.id,h.nom]),a&&a.id]);
  if(cle!==cleLivr){cleLivr=cle;const ong=$('onglets');ong.innerHTML='';
    for(const h of liste){const s=document.createElement('span');s.className='o'+(a&&h.id===a.id?' on':'');
      const nm=document.createElement('span');nm.className='nm';nm.textContent=h.nom;s.appendChild(nm);s.title=h.cible;
      const x=document.createElement('span');x.className='fx';x.textContent='✕';x.title='Fermer ce livrable';
      x.onclick=ev=>{ev.stopPropagation();fermerLivrable(h.id);};s.appendChild(x);
      s.onclick=()=>{courants[actif]=h.id;fetch('/aller/'+h.id);rendreLivrables();};ong.appendChild(s);}}
  $('bcopier').hidden=!a;$('bouvrir').hidden=!a;$('bfermer').hidden=!a;$('btelecharger').hidden=!(a&&!/^https?:/.test(a.cible||''));if(a)$('bcopier').dataset.lien=a.lien||'';
  const vue=a&&a.vue||'';
  if(vue!==srcCadre){srcCadre=vue;const c=$('cadre'),v=$('vide');
    if(vue){c.hidden=false;v.hidden=true;c.src=vue;}else{c.hidden=true;v.hidden=false;c.src='about:blank';}}
  $('vide-txt').textContent=liste.length?'Choisis un livrable dans la barre':'Aucun livrable dans ce chat';
  if(nouveau&&vue)deplier();      // un livrable neuf dans le chat actif rouvre le volet
  if(nouveau)rendreTerms();
}
function fermerLivrable(id){histo=histo.filter(h=>h.id!==id);for(const k in courants)if(courants[k]===id){const n=histo.find(h=>h.terminal===k);if(n)courants[k]=n.id;else delete courants[k];}
  rendreLivrables();fetch('/fermer-livrable/'+id).catch(()=>{});}
// un lien cliqué dans le chat s'affiche dans les livrables de ce chat, jamais dans un navigateur à part
function voirIci(u,t){fetch('/voir',{method:'POST',body:JSON.stringify({cible:u,terminal:t&&t.id})}).then(()=>{deplier();etat();}).catch(()=>{});}
// ✕ Fermer : quitte la visualisation du livrable affiché (sort aussi du plein écran)
function fermerAffiche(){const a=affiche();if(!a)return;sortirPlein();fermerLivrable(a.id);}
function ouvrirLivrable(){const a=affiche();if(a)fetch('/ouvrir-livrable?id='+a.id).catch(()=>{});}
// copier le lien du livrable affiché (par le serveur : pbcopy), confirmation sur le bouton
function copierLien(){const a=affiche(),b=$('bcopier');if(!a)return;
  fetch('/copier?id='+a.id).then(r=>r.json()).then(d=>{if(!d.ok)return;b.classList.add('on');b.textContent='✓ Copié';b.title=d.lien;
    clearTimeout(b._t);b._t=setTimeout(()=>{b.classList.remove('on');b.textContent='⧉ Copier le lien';},1600);}).catch(()=>{});}
// télécharger le livrable affiché : le serveur le copie dans ~/Downloads, confirmation sur le bouton
function telecharger(){const a=affiche(),b=$('btelecharger');if(!a)return;
  fetch('/telecharger?id='+a.id).then(r=>r.json()).then(d=>{b.classList.add('on');b.textContent=d.ok?'✓ Dans Téléchargements':'✕ Pas de fichier';b.title=d.ok?d.chemin:(d.raison||'');
    clearTimeout(b._t);b._t=setTimeout(()=>{b.classList.remove('on');b.textContent='⬇ Télécharger';b.title='Télécharger le livrable (⇧⌘D) : copie du fichier dans Téléchargements';},2200);}).catch(()=>{});}
function recharger(){const a=affiche();fetch('/recharger'+(a?'?id='+a.id:''));if(a&&/^https?:/.test(a.vue||''))$('cadre').src=a.vue;}
function plier(silencieux){sortirPlein();$('haut').classList.add('plie');$('sep').hidden=true;$('pli').textContent='▴ Afficher';localStorage.setItem('plie','1');if(!silencieux)ajuster();}
function deplier(){if(!$('haut').classList.contains('plie'))return;$('haut').classList.remove('plie');$('sep').hidden=false;$('pli').textContent='▁ Réduire';localStorage.setItem('plie','0');ajuster();}
// plein écran : le livrable seul sous le HUD ; ⇧⌘F ou Échap pour revenir
function basculerPlein(){if(document.body.classList.contains('plein'))sortirPlein();else{deplier();document.body.classList.add('plein');$('bplein').classList.add('on');$('bplein').textContent='✕ Quitter le plein écran';}}
function sortirPlein(){if(!document.body.classList.contains('plein'))return;document.body.classList.remove('plein');$('bplein').classList.remove('on');$('bplein').textContent='⛶ Plein écran';ajuster();if(actif&&terms[actif])terms[actif].term.focus();}
$('barre').ondblclick=e=>{if(e.target.closest('.o,.b,.bl'))return;basculerPlein();};
function basculer(){if($('haut').classList.contains('plie'))deplier();else plier();}
// ── séparateurs : hauteur de l'aperçu, largeur de la colonne, largeur du moniteur ──
const cote=$('cote');const wc=parseInt(localStorage.getItem('wc'));if(wc>=120&&wc<=520)cote.style.width=wc+'px';
const mon=$('moniteur');const wm=parseInt(localStorage.getItem('wm'));if(wm>=280&&wm<=900)mon.style.width=wm+'px';
let glisse=null;
$('sep').onmousedown=e=>{glisse='h';document.body.style.cursor='row-resize';cadresInertes(true);e.preventDefault();};
$('sepc').onmousedown=e=>{glisse='c';$('sepc').classList.add('on');document.body.style.cursor='col-resize';cadresInertes(true);e.preventDefault();};
$('sepm').onmousedown=e=>{glisse='m';$('sepm').classList.add('on');document.body.style.cursor='col-resize';cadresInertes(true);e.preventDefault();};
function cadresInertes(on){for(const f of document.querySelectorAll('iframe'))f.style.pointerEvents=on?'none':'';}
window.onmousemove=e=>{if(!glisse)return;
  const z=reg.zoom/100;
  if(glisse==='h'){const h=Math.max(80,Math.min(window.innerHeight-190,e.clientY-$('hud').getBoundingClientRect().bottom));$('haut').style.height=h+'px';}
  else if(glisse==='c'){const w=Math.max(120,Math.min(520,e.clientX/z));cote.style.width=w+'px';}
  else{const w=Math.max(280,Math.min(900,(window.innerWidth-e.clientX)/z));mon.style.width=w+'px';}
  ajuster();};
window.onmouseup=()=>{if(!glisse)return;const g=glisse;glisse=null;document.body.style.cursor='';cadresInertes(false);$('sepc').classList.remove('on');$('sepm').classList.remove('on');
  if(g==='h')localStorage.setItem('h',$('haut').style.height);else if(g==='c')localStorage.setItem('wc',parseInt(cote.style.width));else localStorage.setItem('wm',parseInt(mon.style.width));ajuster();};
// ── terminaux ──
const terms={}; let actif=null; const enc=new TextEncoder();
const fermes=new Map();   // id → date de fermeture locale : le serveur peut encore le lister pendant une seconde
function envoyer(t,octets){try{if(t.ws&&t.ws.readyState===1)t.ws.send(octets);}catch(x){}}
function connecter(t){
  const ws=new WebSocket('ws://127.0.0.1:'+PORT_WS+'/?id='+t.id+'&j='+encodeURIComponent(window.JETON_OSROM||''));ws.binaryType='arraybuffer';t.ws=ws;
  ws.onopen=()=>{try{t.term.reset();}catch(x){} t.vivant=true;if(actif===t.id){ouvrirVue(t);ajusterUn(t,true);t.term.focus();}rendreTerms();};
  ws.onmessage=m=>t.term.write(new Uint8Array(m.data));
  ws.onclose=()=>{if(!terms[t.id]||t.ws!==ws)return;t.ws=null;
    if(listeServeur.find(s=>s.id===t.id)){setTimeout(()=>{if(terms[t.id]&&!t.ws)connecter(t);},1000);}
    else{t.vivant=false;t.term.write('\r\n\x1b[90m[terminal fermé]\x1b[0m\r\n');rendreTerms();}};
  ws.onerror=()=>{};
}
function creerVue(id){
  const div=document.createElement('div');div.className='term';div.hidden=true;div.dataset.id=id;$('terms').appendChild(div);
  const term=new Terminal({fontFamily:reg.police,fontSize:reg.taille,lineHeight:1.2,cursorBlink:true,scrollback:20000,macOptionIsMeta:true,allowProposedApi:true,theme:themeXterm()});
  const fit=new FitAddon.FitAddon();term.loadAddon(fit);term.loadAddon(new WebLinksAddon.WebLinksAddon((e,u)=>voirIci(u,terms[id])));
  term.loadAddon(new Unicode11Addon.Unicode11Addon());term.unicode.activeVersion='11';   // largeurs comme Claude Code (⚡, emojis = 2 cases), sinon la statusline se redessine décalée
  const t={id,term,fit,div,ws:null,titre:'',vivant:true,ouvert:false,taille:'',minuteur:null,titreMin:null};
  term.onTitleChange(x=>{t.titre=x;rendreTerms();
    clearTimeout(t.titreMin);t.titreMin=setTimeout(()=>fetch('/terminaux/'+id+'/titre',{method:'POST',body:JSON.stringify({titre:x})}).catch(()=>{}),400);});   // le moniteur à part connaît le nom du chat
  // ⌘↵ ou ⇧↵ : retour à la ligne dans le chat Claude (séquence Meta+Entrée, comprise sans /terminal-setup)
  term.attachCustomKeyEventHandler(e=>{
    if(e.type==='keydown'&&e.key==='Enter'&&(e.metaKey||e.shiftKey)){envoyer(t,enc.encode('\x1b\r'));return false;}
    if(e.metaKey&&e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown'))return false;
    if(e.metaKey&&['k','t','w','b','l','j','n','g','p','a',',','1','2','3','4','5','6','7','8','9'].includes(e.key.toLowerCase()))return false;  // raccourcis OS KADANS
    if(e.metaKey&&e.shiftKey&&e.key.toLowerCase()==='v')return false;
    return true;
  });
  term.onData(d=>envoyer(t,enc.encode(d)));
  term.onBinary(d=>envoyer(t,Uint8Array.from(d,c=>c.charCodeAt(0))));
  terms[id]=t;connecter(t);return t;
}
function ouvrirVue(t){if(t.ouvert)return;t.ouvert=true;t.div.hidden=false;t.term.open(t.div);}
function ajusterUn(t,toutDeSuite){
  if(!t.ouvert||t.div.hidden)return;
  try{t.fit.fit();}catch(x){return;}
  const envoi=()=>{const s=t.term.rows+'x'+t.term.cols;if(s!==t.taille||toutDeSuite){t.taille=s;envoyer(t,JSON.stringify({r:t.term.rows,c:t.term.cols}));}};
  if(toutDeSuite){envoi();return;}
  clearTimeout(t.minuteur);t.minuteur=setTimeout(envoi,120);   // pas une rafale de SIGWINCH pendant un glissement
}
function ajuster(){if(actif&&terms[actif])ajusterUn(terms[actif]);}
function activer(id){
  if(!terms[id])return;actif=id;
  const sv=listeServeur.find(x=>x.id===id);if(sv){vuChats[cleVu(sv)]=Date.now()/1000;sauverVus();}
  for(const k in terms)terms[k].div.hidden=(k!==id);
  ouvrirVue(terms[id]);requestAnimationFrame(()=>{const t=terms[id];if(!t)return;ajusterUn(t,true);t.term.focus();});rendreTerms();localStorage.setItem('actif',id);
  fetch('/terminaux/actif',{method:'POST',body:JSON.stringify({id})}).catch(()=>{});   // un `voir` venu d'ailleurs se range dans ce chat
  if(vus)rendreLivrables();
  if(moniteur)moniteur.suivre();
}
let listeServeur=[], cleTerms='', creation=false, glisseTerm=null, ordreLocal=0, premier=PARAMS.get('terminal'), FEN=PARAMS.get('fen')||'0';   // chaque fenêtre ne montre que ses chats
function rendreTerms(liste){
  const posActif=listeServeur.findIndex(s=>s.id===actif);let perdu=-1;
  if(liste){const maintenant=Date.now();for(const [k,d] of fermes)if(maintenant-d>5000)fermes.delete(k);
    liste=liste.filter(s=>!fermes.has(s.id));
    for(const s of liste){const g=groupesLocaux[s.id];if(g&&maintenant-g.t<3000)s.groupe=g.g;}   // une catégorie posée à l'instant prime le temps que le serveur suive
    if(Date.now()-ordreLocal<3000){const pos={};listeServeur.forEach((s,i)=>pos[s.id]=i);liste.sort((a,b)=>(pos[a.id]??1e9)-(pos[b.id]??1e9));}   // un déplacement local prime le temps que le serveur suive
    listeServeur=liste;}
  listeServeur=regrouper(listeServeur);
  for(const s of listeServeur)if(!terms[s.id])creerVue(s.id);
  for(const k in terms)if(!listeServeur.find(s=>s.id===k)){const t=terms[k];delete terms[k];try{if(t.ws){t.ws.onclose=null;t.ws.close();}t.term.dispose();}catch(x){}t.div.remove();if(actif===k){actif=null;perdu=posActif;}}
  if(!actif&&perdu>=0&&listeServeur.length){activer(listeServeur[Math.min(perdu,listeServeur.length-1)].id);return;}   // chat fermé par `exit` : on passe au suivant
  if(!actif&&listeServeur.length){const m=premier||localStorage.getItem('actif');premier=null;activer(m in terms?m:listeServeur[0].id);}
  if(liste&&!listeServeur.length&&!creation)nouveau();   // plus aucun terminal (exit partout) : on en rouvre un
  const act=(serveur.activite&&serveur.activite.par_terminal)||{}, fini=(serveur.activite&&serveur.activite.fini)||{};
  const maint=Date.now()/1000;let vusModif=false;
  const lignes=listeServeur.map((s,i)=>{const t=terms[s.id],cv=cleVu(s),f=fini[s.id]||0;
    if(vuChats[cv]==null||(s.id===actif&&f>vuChats[cv])){vuChats[cv]=Math.max(maint,f);vusModif=true;}   // le chat affiché est lu ; un chat vu pour la première fois part lu
    const trav=s.claude&&act[s.id]?act[s.id]:null, pret=!!(s.claude&&!trav&&f&&f>vuChats[cv]);
    return {id:s.id,num:String(i+1).padStart(2,'0'),titre:titreComplet(s),nomme:!!s.nom,g:s.groupe||'',sous:sousLigne(s,t,trav,pret,f),on:s.id===actif,
      ia:s.claude?(trav?'trav':pret?'pret':'on'):'',trav:!!trav,pret,
      nouveau:!!vus&&s.id!==actif&&histo.some(h=>h.terminal===s.id&&!vus.has(h.id))};});   // la sous-ligne change chaque minute : le chrono suit
  if(vusModif)sauverVus();
  dernieresLignes=lignes;
  const nt=lignes.filter(l=>l.trav).length,bt=$('n-trav');bt.hidden=!nt;bt.textContent='⚡ '+nt;bt.title=nt+(nt>1?' chats où Claude travaille':' chat où Claude travaille');
  const np=lignes.filter(l=>l.pret).length,bp=$('n-pret');bp.hidden=!np;bp.textContent='✓ '+np;bp.title=np+(np>1?' réponses prêtes, pas encore lues':' réponse prête, pas encore lue')+' · clic ou ⇧⌘A : y aller';
  const q=normer($('cherche').value);
  const vis=q?lignes.filter(l=>normer(l.titre+' '+l.g+' '+l.sous).includes(q)):lignes;
  const cle=JSON.stringify([lignes,[...plies],q]);if(cle===cleTerms||renomme)return;cleTerms=cle;
  const ong=$('onglets-term');ong.innerHTML='';
  const stats={};for(const l of lignes){const st=stats[l.g]||(stats[l.g]={n:0,trav:0,pret:0,nouveau:false});st.n++;if(l.trav)st.trav++;if(l.pret)st.pret++;if(l.nouveau)st.nouveau=true;}
  if(q&&!vis.length){const v=document.createElement('div');v.className='rien';v.textContent='Aucun chat pour « '+$('cherche').value.trim()+' »';ong.appendChild(v);}
  let gc='';
  for(const l of vis){
    if(l.g&&l.g!==gc){const st=stats[l.g],pl=plies.has(l.g)&&!q;
      const h=document.createElement('div');h.className='g'+(pl?' plie':'')+(pl&&st.trav?' trav':'')+(pl&&st.pret?' pret':'')+(pl&&st.nouveau?' nouveau':'');h.dataset.g=l.g;
      h.innerHTML='<span class="fl"></span><span class="gn"></span><span class="gc"></span><span class="gt"></span>';
      h.querySelector('.fl').textContent=pl?'▸':'▾';h.querySelector('.gn').textContent=l.g;h.querySelector('.gc').textContent=st.n;
      h.querySelector('.gt').textContent=(st.trav?'⚡ '+st.trav+' ':'')+(pl&&st.pret?'✓ '+st.pret:'');h.title='Clic : replier / déplier · double clic : renommer la catégorie · glisse un chat dessus pour l’y ranger';
      h.onclick=()=>{if(aGlisse)return;if(pl)plies.delete(l.g);else plies.add(l.g);sauverPlies();rendreTerms();};
      h.ondblclick=ev=>{ev.preventDefault();renommerGroupe(l.g);};
      ong.appendChild(h);}
    gc=l.g;
    if(l.g&&plies.has(l.g)&&!l.on&&!q)continue;          // catégorie repliée : seul le chat actif reste visible (sauf pendant une recherche)
    const d=document.createElement('div');d.className='t'+(l.on?' on':'')+(l.nouveau?' nouveau':'')+(l.trav?' trav':'')+(l.pret?' pret':'');
    d.innerHTML='<span class="pt" title="Nouveau livrable dans ce chat"></span><span class="titre"><span class="num"></span><span class="ia"></span><span class="tx"></span></span><span class="sous"></span><span class="mu" title="Actions : renommer, catégorie, fermer (clic droit)">⋯</span><span class="x" title="Fermer (⌘W, clic molette)">✕</span>';
    d.querySelector('.num').textContent=l.num;d.querySelector('.tx').textContent=l.titre;d.querySelector('.sous').textContent=l.sous;d.title=l.titre;
    const ia=d.querySelector('.ia');ia.className='ia '+l.ia;ia.title=l.ia==='trav'?'Claude travaille':l.ia==='pret'?'Réponse prête, pas encore lue':l.ia==='on'?'Claude en attente':'shell';
    d.onclick=()=>{if(!aGlisse)activer(l.id);};d.querySelector('.x').onclick=ev=>{ev.stopPropagation();fermer(l.id);};
    d.querySelector('.mu').onclick=ev=>{ev.stopPropagation();const r=ev.target.getBoundingClientRect();menuChat(l.id,r.left,r.bottom+2);};
    d.oncontextmenu=ev=>{ev.preventDefault();menuChat(l.id,ev.clientX,ev.clientY);};
    d.onauxclick=ev=>{if(ev.button===1){ev.preventDefault();ev.stopPropagation();fermer(l.id);}};
    if(l.g)d.classList.add('dans-g');d.ondblclick=ev=>{ev.preventDefault();renommer(l.id);};
    if(l.nomme)d.querySelector('.tx').title='Nom choisi · vide = titre automatique';
    d.dataset.id=l.id;if(q&&l===vis[0])d.classList.add('premier');   // Entrée ouvre celui-ci
    d.onmousedown=ev=>{if(ev.button===1)ev.preventDefault();if(ev.button!==0||ev.target.classList.contains('x')||ev.target.classList.contains('mu')||ev.target.tagName==='INPUT')return;aGlisse=false;presse={id:l.id,x:ev.clientX,y:ev.clientY,el:d};};
    ong.appendChild(d);}
}
function ilya(t){const m=Math.floor((Date.now()/1000-t)/60);return m<1?"à l'instant":m<60?'il y a '+m+' min':m<1440?'il y a '+Math.floor(m/60)+' h':'il y a '+Math.floor(m/1440)+' j';}
function titreComplet(s){const t=terms[s.id];return (s.nom||(t&&t.titre)||s.titre||('Terminal '+s.id)).replace(/^[✳✶✻✽●○◐◑◒◓⚡]\s*/,'');}
// sous-ligne : ce que fait le chat (au travail, réponse prête, au repos depuis…) ; le dossier seulement s'il n'est pas le workspace
function sousLigne(s,t,trav,pret,f){
  if(t&&!t.vivant)return 'fermé';
  const dos=s.cwd&&serveur.cwd_defaut&&s.cwd!==serveur.cwd_defaut?s.cwd.split('/').pop():'';
  const e=trav?'⚡ travaille · '+dureeTrav(trav.depuis)+(trav.outil?' · '+String(trav.outil).replace(/^mcp__[^_]+(__)?/,''):'')
    :pret?'✓ réponse prête · '+ilya(f):s.claude?(f?'répondu '+ilya(f):'en attente'):'shell';
  return dos&&!trav?'▸ '+dos+' · '+e:e;}
function normer(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
// « réponse prête » : Claude a fini (Stop) après la dernière fois où le chat était à l'écran ; clé = session Claude, qui survit à un redémarrage
let vuChats={};try{vuChats=JSON.parse(localStorage.getItem('vuchats')||'{}')||{};}catch(x){}
function cleVu(s){return s.session||('t'+s.id);}
function sauverVus(){vuChats=Object.fromEntries(Object.entries(vuChats).sort((a,b)=>b[1]-a[1]).slice(0,300));try{localStorage.setItem('vuchats',JSON.stringify(vuChats));}catch(x){}}
let dernieresLignes=[];
function allerPret(){const ids=listeServeur.map(s=>s.id),i=Math.max(0,ids.indexOf(actif)),n=ids.length;
  const p=dernieresLignes.filter(l=>l.pret).map(l=>l.id).sort((a,b)=>((ids.indexOf(a)-i+n)%n)-((ids.indexOf(b)-i+n)%n));if(p.length)activer(p[0]);}
// ⌥⌘↑ / ⌥⌘↓ : chat précédent / suivant dans la colonne telle qu'elle s'affiche
function voisinChat(sens){const ids=[...document.querySelectorAll('#onglets-term .t')].map(d=>d.dataset.id);if(!ids.length)return;
  let i=ids.indexOf(actif);i=i<0?0:(i+sens+ids.length)%ids.length;activer(ids[i]);
  const d=document.querySelector('#onglets-term .t[data-id="'+ids[i]+'"]');if(d)d.scrollIntoView({block:'nearest'});}
// recherche : filtre titre, catégorie, état ; Entrée ouvre le premier, Échap vide
const cherche=$('cherche');
cherche.oninput=()=>{cleTerms='';rendreTerms();};
cherche.onkeydown=ev=>{ev.stopPropagation();
  if(ev.key==='Escape'){ev.preventDefault();cherche.value='';cleTerms='';rendreTerms();const t=terms[actif];if(t)t.term.focus();}
  else if(ev.key==='Enter'){ev.preventDefault();const d=document.querySelector('#onglets-term .t');if(d){cherche.value='';cleTerms='';activer(d.dataset.id);}}
  else if(ev.key==='ArrowDown'){ev.preventDefault();voisinChat(1);cherche.focus();}
  else if(ev.key==='ArrowUp'){ev.preventDefault();voisinChat(-1);cherche.focus();}};
function chercher(){const c=$('cote');if(c.hidden){c.hidden=false;$('sepc').hidden=false;ajuster();}cherche.focus();cherche.select();}
function basculerAide(on){const a=$('aide');a.hidden=on===undefined?!a.hidden:!on;$('baide').classList.toggle('on',!a.hidden);try{localStorage.setItem('aide',a.hidden?'0':'1');}catch(x){}}
try{if(localStorage.getItem('aide')==='1')basculerAide(true);}catch(x){}
// chats fermés récemment : ↺ ou ⇧⌘T les rouvre avec leur session Claude, leur nom et leur catégorie
let recents=[];try{recents=JSON.parse(localStorage.getItem('recents')||'[]')||[];}catch(x){}
function sauverRecents(){try{localStorage.setItem('recents',JSON.stringify(recents));}catch(x){}}
function memoriserFerme(s){if(!s||!s.claude||!s.session)return;
  recents=[{session:s.session,cwd:s.cwd,nom:s.nom||'',titre:titreComplet(s),groupe:s.groupe||'',t:Date.now()/1000},...recents.filter(r=>r.session!==s.session)].slice(0,12);sauverRecents();}
async function rouvrir(r){if(!r||creation)return;creation=true;
  recents=recents.filter(x=>x.session!==r.session);sauverRecents();
  try{const q=await fetch('/terminaux/nouveau',{method:'POST',body:JSON.stringify({fen:FEN,reprendre:r.session,cwd:r.cwd,nom:r.nom,groupe:r.groupe})});const d=await q.json();
    if(!d.id)return;d.groupe=r.groupe;d.nom=r.nom;d.session=r.session;d.claude=true;groupesLocaux[d.id]={g:r.groupe,t:Date.now()};
    if(!listeServeur.find(s=>s.id===d.id))listeServeur.push(d);rendreTerms();activer(d.id);}
  catch(x){}finally{creation=false;}}
function menuRouvrir(){const b=$('brouvrir').getBoundingClientRect();
  ouvrirMenu(b.left,b.bottom+2,(m,ligne,tete)=>{tete('Chats fermés récemment');
    if(!recents.length){const v=document.createElement('div');v.className='mi vide';v.textContent='Aucun';m.appendChild(v);return;}
    for(const r of recents)ligne(r.titre.slice(0,34),'',()=>{fermerMenu();rouvrir(r);},ilya(r.t).replace('il y a ',''));
    ligne('Vider la liste','hors',()=>{recents=[];sauverRecents();fermerMenu();});});}
function dureeTrav(t){const m=Math.floor((Date.now()/1000-t)/60);return m<1?"à l'instant":m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');}
// ── renommer un chat : double clic ou ✎, Entrée garde, Échap annule, vide = titre automatique ──
let renomme=null, finirRenommage=null;
document.addEventListener('mousedown',ev=>{if(renomme&&!(ev.target.classList&&ev.target.classList.contains('ren'))&&finirRenommage)finirRenommage();},true);   // xterm garde le focus au clic : on valide nous-mêmes
function renommer(id){
  const d=document.querySelector('#onglets-term .t[data-id="'+id+'"]');const s=listeServeur.find(x=>x.id===id);if(!d||!s||renomme)return;
  renomme=id;presse=null;d.classList.add('renomme');
  const tx=d.querySelector('.tx');const i=document.createElement('input');i.className='ren';i.maxLength=60;
  const avant=s.nom||tx.textContent;i.value=avant;i.placeholder='titre automatique';tx.replaceWith(i);
  let fini=false;const t0=Date.now();
  const viser=()=>{if(!fini){i.focus();i.select();}};viser();
  const finir=garder=>{if(fini)return;fini=true;renomme=null;
    const v=i.value.replace(/\s+/g,' ').trim();
    if(garder&&v!==avant){s.nom=v;
      fetch('/terminaux/'+id+'/nom',{method:'POST',body:JSON.stringify({nom:v})}).catch(()=>{});}
    cleTerms='';rendreTerms();const t=terms[actif];if(t)t.term.focus();};
  finirRenommage=()=>finir(true);
  i.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();finir(true);}else if(ev.key==='Escape'){ev.preventDefault();finir(false);}};
  i.onblur=()=>{if(Date.now()-t0<300)return setTimeout(viser,0);finir(true);};   // activer() rend le focus au terminal juste après le double clic
  i.onclick=ev=>ev.stopPropagation();i.onmousedown=ev=>ev.stopPropagation();i.ondblclick=ev=>ev.stopPropagation();
}
// ── ordre des onglets : on presse, on bouge de 5 px, on lâche où on veut (souris, comme dans Warp) ──
let presse=null;
function sousSouris(ev){const el=document.elementFromPoint(ev.clientX,ev.clientY);const g=el&&el.closest('#onglets-term .g');if(g)return g;const t=el&&el.closest('#onglets-term .t');if(t)return t;return el&&el.closest('#onglets-term')?'fin':null;}
document.addEventListener('mousemove',ev=>{
  if(!presse)return;
  if(!glisseTerm){if(Math.abs(ev.clientX-presse.x)+Math.abs(ev.clientY-presse.y)<5)return;glisseTerm=presse.id;presse.el.classList.add('glisse');document.body.style.cursor='grabbing';}
  const c=sousSouris(ev);
  if(c==='fin')marquer('fin');else if(c&&c.dataset.g!==undefined)marquer(c,'cible');else if(c&&c.dataset.id!==glisseTerm)marquer(c,avantOuApres(c,ev));else marquer(null,null,true);
});
document.addEventListener('mouseup',ev=>{
  if(!presse)return;
  const p=presse;presse=null;
  if(!glisseTerm)return;                         // simple clic : onclick fait le travail
  const c=sousSouris(ev);const id=glisseTerm;glisseTerm=null;document.body.style.cursor='';
  marquer(null);p.el.classList.remove('glisse');
  if(c==='fin')deplacer(id,null,false);else if(c&&c.dataset.g!==undefined)mettreGroupe(id,c.dataset.g);else if(c&&c.dataset.id!==id)deplacer(id,c.dataset.id,avantOuApres(c,ev)==='avant');
  aGlisse=true;setTimeout(()=>aGlisse=false,0);
},true);
let aGlisse=false;
$('onglets-term').addEventListener('click',ev=>{if(aGlisse){ev.stopPropagation();ev.preventDefault();}},true);
function avantOuApres(d,ev){const r=d.getBoundingClientRect();return ev.clientY<r.top+r.height/2?'avant':'apres';}
function marquer(el,pos,garder){for(const x of document.querySelectorAll('#onglets-term .g'))x.classList.remove('cible');
  for(const x of document.querySelectorAll('#onglets-term .t')){x.classList.remove('avant','apres');if(!el&&!garder)x.classList.remove('glisse');}$('onglets-term').classList.toggle('fin',el==='fin');if(el&&el!=='fin')el.classList.add(pos);}
function deplacer(src,cible,avant){
  if(!src||src===cible)return;
  const s=listeServeur.find(x=>x.id===src);if(!s)return;
  const l=listeServeur.filter(x=>x.id!==src);
  let i=cible===null?l.length:l.findIndex(x=>x.id===cible);if(i<0)i=l.length;else if(!avant)i++;
  l.splice(i,0,s);
  const voisin=cible!==null?listeServeur.find(x=>x.id===cible):l[l.length-2];   // posé à côté d'un chat : il prend sa catégorie
  const g=voisin?(voisin.groupe||''):(s.groupe||'');if(g!==(s.groupe||''))poserGroupe(s,g);
  listeServeur=l;ordreLocal=Date.now();cleTerms='';rendreTerms();
  fetch('/terminaux/ordre',{method:'POST',body:JSON.stringify({ordre:l.map(x=>x.id)})}).catch(()=>{});
}
async function nouveau(){
  if(creation)return;creation=true;
  const g=(listeServeur.find(s=>s.id===actif)||{}).groupe||'';
  try{const r=await fetch('/terminaux/nouveau',{method:'POST',body:JSON.stringify({fen:FEN,groupe:g})});const d=await r.json();d.groupe=g;
    if(!listeServeur.find(s=>s.id===d.id))listeServeur.push(d);rendreTerms();activer(d.id);}
  catch(x){}finally{creation=false;}
}
async function fermer(id){
  fermes.set(id,Date.now());
  const idx=listeServeur.findIndex(s=>s.id===id);
  const g=idx>=0?(listeServeur[idx].groupe||''):'';
  if(idx>=0)memoriserFerme(listeServeur[idx]);
  listeServeur=listeServeur.filter(s=>s.id!==id);
  if(actif===id){actif=null;const n=suivant(idx,g);if(n)activer(n);}
  rendreTerms();
  try{await fetch('/terminaux/'+id+'/fermer');}catch(x){}
  if(!listeServeur.length)nouveau();else if(!actif)activer(listeServeur[Math.max(0,Math.min(idx,listeServeur.length-1))].id);
}
// chat qui prend la place d'un chat fermé : le suivant de sa catégorie, sinon le précédent, sinon le suivant de la barre
function suivant(idx,g){const l=listeServeur;if(!l.length||idx<0)return null;
  const apres=l[idx],avant=l[idx-1];
  if(apres&&(apres.groupe||'')===g)return apres.id;if(avant&&(avant.groupe||'')===g)return avant.id;
  return (apres||avant||l[l.length-1]).id;}
// ── catégories de chats : clic droit ou ▤ sur un onglet, ⇧⌘G pour le chat actif ; repliables, gardées à la reprise ──
const groupesLocaux={};
let plies=new Set();try{plies=new Set(JSON.parse(localStorage.getItem('plies')||'[]'));}catch(x){}
function sauverPlies(){try{localStorage.setItem('plies',JSON.stringify([...plies]));}catch(x){}}
function regrouper(l){const rang=new Map([['',0]]);for(const s of l){const g=s.groupe||'';if(!rang.has(g))rang.set(g,rang.size);}
  return l.map((s,i)=>[s,i]).sort((a,b)=>rang.get(a[0].groupe||'')-rang.get(b[0].groupe||'')||a[1]-b[1]).map(x=>x[0]);}
function nomsGroupes(){const v=[];for(const s of listeServeur)if(s.groupe&&!v.includes(s.groupe))v.push(s.groupe);return v;}
function poserGroupe(s,g){g=String(g||'').replace(/\s+/g,' ').trim().slice(0,40);s.groupe=g;groupesLocaux[s.id]={g,t:Date.now()};
  fetch('/terminaux/'+s.id+'/groupe',{method:'POST',body:JSON.stringify({groupe:g})}).catch(()=>{});}
function mettreGroupe(id,g){const s=listeServeur.find(x=>x.id===id);if(!s)return;
  const l=listeServeur.filter(x=>x!==s);let i=-1;l.forEach((x,k)=>{if((x.groupe||'')===g)i=k;});l.splice(i<0?l.length:i+1,0,s);   // en fin de catégorie
  poserGroupe(s,g);listeServeur=l;ordreLocal=Date.now();cleTerms='';rendreTerms();
  fetch('/terminaux/ordre',{method:'POST',body:JSON.stringify({ordre:l.map(x=>x.id)})}).catch(()=>{});
  const t=terms[actif];if(t)t.term.focus();}
function fermerMenu(){const m=$('menu-g');if(m)m.remove();}
document.addEventListener('mousedown',ev=>{const m=$('menu-g');if(m&&!m.contains(ev.target))fermerMenu();},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&$('menu-g')){fermerMenu();ev.preventDefault();ev.stopPropagation();const t=terms[actif];if(t)t.term.focus();}},true);   // Échap ferme le menu même quand le focus est resté dans le terminal
function ouvrirMenu(x,y,construire){
  fermerMenu();presse=null;
  const m=document.createElement('div');m.id='menu-g';
  const ligne=(txt,cls,fn,k)=>{const e=document.createElement('div');e.className='mi'+(cls?' '+cls:'');const tx=document.createElement('span');tx.textContent=txt;e.appendChild(tx);
    if(k){const kb=document.createElement('span');kb.className='k';kb.textContent=k;e.appendChild(kb);}e.onclick=ev=>{ev.stopPropagation();fn();};m.appendChild(e);return e;};
  const tete=txt=>{const e=document.createElement('div');e.className='mt';e.textContent=txt;m.appendChild(e);return e;};
  construire(m,ligne,tete);
  document.body.appendChild(m);
  const r=m.getBoundingClientRect();m.style.left=Math.max(4,Math.min(x,innerWidth-r.width-4))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-r.height-4))+'px';
  m.onkeydown=ev=>{if(ev.key==='Escape'){fermerMenu();const t=terms[actif];if(t)t.term.focus();}};
  return m;
}
function menuChat(id,x,y){
  const s=listeServeur.find(v=>v.id===id);if(!s)return;let champ=null;
  ouvrirMenu(x,y,(m,ligne,tete)=>{
    tete(titreComplet(s).slice(0,40)).classList.add('nom');
    ligne('✎ Renommer','',()=>{fermerMenu();if(actif!==id)activer(id);setTimeout(()=>renommer(id),0);},'⇧⌘E');
    tete('Catégorie');
    for(const g of nomsGroupes())ligne((g===s.groupe?'✓ ':'   ')+g,g===s.groupe?'on':'',()=>{fermerMenu();mettreGroupe(id,g);});
    champ=document.createElement('input');champ.className='mn';champ.placeholder='＋ Nouvelle catégorie…';champ.maxLength=40;m.appendChild(champ);
    champ.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();const v=champ.value.trim();fermerMenu();if(v){plies.delete(v);sauverPlies();mettreGroupe(id,v);}}else if(ev.key==='Escape'){fermerMenu();const t=terms[actif];if(t)t.term.focus();}};
    champ.onmousedown=ev=>ev.stopPropagation();
    if(s.groupe)ligne('   Sans catégorie','',()=>{fermerMenu();mettreGroupe(id,'');});
    ligne('✕ Fermer le chat','hors danger',()=>{fermerMenu();fermer(id);},'⌘W');});
  setTimeout(()=>{if(champ)champ.focus();},0);
}
function renommerGroupe(g){
  const h=[...document.querySelectorAll('#onglets-term .g')].find(x=>x.dataset.g===g);if(!h||renomme)return;
  renomme='g:'+g;const gn=h.querySelector('.gn');const i=document.createElement('input');i.className='ren';i.maxLength=40;i.value=g;gn.replaceWith(i);
  let fini=false;const t0=Date.now();i.focus();i.select();
  const finir=garder=>{if(fini)return;fini=true;renomme=null;finirRenommage=null;
    const v=i.value.replace(/\s+/g,' ').trim();
    if(garder&&v!==g){for(const s of listeServeur)if(s.groupe===g)poserGroupe(s,v);if(plies.delete(g)&&v)plies.add(v);sauverPlies();}   // vide = les chats sortent de la catégorie
    cleTerms='';rendreTerms();const t=terms[actif];if(t)t.term.focus();};
  finirRenommage=()=>finir(true);
  i.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();finir(true);}else if(ev.key==='Escape'){ev.preventDefault();finir(false);}};
  i.onblur=()=>{if(Date.now()-t0<300)return setTimeout(()=>{if(!fini)i.focus();},0);finir(true);};
  i.onclick=ev=>ev.stopPropagation();i.onmousedown=ev=>ev.stopPropagation();i.ondblclick=ev=>ev.stopPropagation();
}
// ── fenêtres : ⌘N une nouvelle fenêtre (nouveau chat dedans), moniteur à part à droite ──
function nouvelleFenetre(){fetch('/fenetre?vue=principal').catch(()=>{});}
function fenetreMoniteur(){fetch('/fenetre?vue=moniteur').catch(()=>{});}
function basculerAuto(){fetch('/moniteur/auto',{method:'POST',body:JSON.stringify({auto:!$('bauto').classList.contains('on')})}).then(()=>fetch('/etat').then(r=>r.json()).then(rendreHud)).catch(()=>{});}
// ── moniteur : panneau de droite (⌘J), même flux que la fenêtre à part ──
let moniteur=null, moniteurForce=false;
function montrerMoniteur(on,force){
  mon.hidden=!on;$('sepm').hidden=!on;$('bmon').classList.toggle('on',on);localStorage.setItem('mon',on?'1':'0');moniteurForce=!!force&&on;
  if(on&&!moniteur)moniteur=Moniteur($('mon-corps'),{filtre:()=>monTous?null:actif,noms:()=>Object.fromEntries(listeServeur.map(s=>[s.id,titreTerm(s.id)])),
    etat:(enCours,n)=>{const l=$('mon-led');l.className='led '+(enCours?'on':n?'ok':'');$('mon-n').textContent=n?n+' évén.':'';}});
  fetch('/moniteur/panneau',{method:'POST',body:JSON.stringify({visible:on})}).catch(()=>{});
  ajuster();
}
let monTous=localStorage.getItem('montous')==='1';
function monBascTous(){monTous=!monTous;localStorage.setItem('montous',monTous?'1':'0');$('mon-tous').classList.toggle('on',monTous);if(moniteur)moniteur.suivre();}
$('mon-tous').classList.toggle('on',monTous);
if(localStorage.getItem('mon')==='1')montrerMoniteur(true,true);
window.addEventListener('resize',ajuster);
new ResizeObserver(ajuster).observe($('terms'));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.body.classList.contains('plein')){sortirPlein();e.preventDefault();return;}
  if(e.metaKey&&e.altKey&&!e.ctrlKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){voisinChat(e.key==='ArrowUp'?-1:1);e.preventDefault();return;}
  if(!e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key.toLowerCase();
  if(k==='k'&&actif){terms[actif].term.clear();e.preventDefault();}
  else if(k==='t'){if(e.shiftKey)rouvrir(recents[0]);else nouveau();e.preventDefault();}
  else if(k==='p'&&!e.shiftKey){chercher();e.preventDefault();}
  else if(k==='a'&&e.shiftKey){allerPret();e.preventDefault();}
  else if(k==='n'){nouvelleFenetre();e.preventDefault();}
  else if(k==='w'){if(actif)fermer(actif);e.preventDefault();}
  else if(k==='b'){const c=$('cote');c.hidden=!c.hidden;$('sepc').hidden=c.hidden;ajuster();e.preventDefault();}
  else if(k==='c'&&e.shiftKey){copierLien();e.preventDefault();}
  else if(k==='d'&&e.shiftKey){telecharger();e.preventDefault();}
  else if(k==='o'&&e.shiftKey){ouvrirLivrable();e.preventDefault();}
  else if(k==='f'&&e.shiftKey){basculerPlein();e.preventDefault();}
  else if(k==='e'&&e.shiftKey){if(actif){const c=$('cote');if(c.hidden){c.hidden=false;$('sepc').hidden=false;ajuster();}renommer(actif);}e.preventDefault();}
  else if(k==='g'&&e.shiftKey){if(actif){const c=$('cote');if(c.hidden){c.hidden=false;$('sepc').hidden=false;ajuster();}
    const d=document.querySelector('#onglets-term .t[data-id="'+actif+'"]');const r=d?d.getBoundingClientRect():{left:20,bottom:60};menuChat(actif,r.left+12,r.bottom+2);}e.preventDefault();}
  else if(k==='l'){if(e.shiftKey){const a=affiche();if(a)fermerLivrable(a.id);}else basculer();e.preventDefault();}
  else if(k==='j'){if(e.shiftKey)fenetreMoniteur();else montrerMoniteur(mon.hidden,true);e.preventDefault();}
  else if(k==='v'&&e.shiftKey){basculerJarvis();e.preventDefault();}
  else if(k===','){basculerReglages();e.preventDefault();}
  else if(e.key>='1'&&e.key<='9'){const s=listeServeur[parseInt(e.key)-1];if(s)activer(s.id);e.preventDefault();}
});
// ── fichiers : glisser-déposer ou coller (captures) → copiés dans depots/, chemin tapé dans le terminal ──
function taper(texte){if(!actif||!terms[actif])return;envoyer(terms[actif],enc.encode(texte));terms[actif].term.focus();}
async function deposer(f){
  if(!f)return;
  const nom=f.name&&f.name!=='image.png'?f.name:('capture-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+(f.type==='image/png'?'.png':''));
  try{const r=await fetch('/deposer?nom='+encodeURIComponent(nom),{method:'POST',body:f});const d=await r.json();if(d.chemin)taper(d.chemin+' ');}catch(x){}
}
async function choisir(){
  try{const r=await fetch('/choisir');const d=await r.json();if(d.chemins&&d.chemins.length)taper(d.chemins.join(' ')+' ');}catch(x){}
  if(actif&&terms[actif])terms[actif].term.focus();
}
const zone=$('bas');
document.addEventListener('dragover',e=>{e.preventDefault();zone.style.outline='2px solid '+(cssv('--ac')||'#39ff88');zone.style.outlineOffset='-2px';});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)zone.style.outline='';});
document.addEventListener('drop',async e=>{e.preventDefault();zone.style.outline='';
  const fichiers=[...(e.dataTransfer.files||[])];
  if(fichiers.length){for(const f of fichiers)await deposer(f);return;}
  const txt=e.dataTransfer.getData('text');if(txt)taper(txt);
});
document.addEventListener('paste',e=>{
  const items=[...(e.clipboardData&&e.clipboardData.items||[])].filter(i=>i.kind==='file');
  if(!items.length)return;
  e.preventDefault();e.stopPropagation();
  items.forEach(i=>deposer(i.getAsFile()));
},true);
etat();

function majCerveau(c){}
