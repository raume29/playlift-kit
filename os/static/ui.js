// OS KADANS · page principale. Livrables par chat, terminaux (xterm + pty), moniteur, fenêtres.
const PORT_WS=parseInt(document.body.dataset.ws);
const PARAMS=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
// ── effets (scanlines, halos) : FX dans le HUD ──
function fx(on){document.body.classList.toggle('fx',on);$('bfx').classList.toggle('on',on);localStorage.setItem('fx',on?'1':'0');}
fx(localStorage.getItem('fx')!=='0');
$('bfx').onclick=()=>fx(!document.body.classList.contains('fx'));
// ── thèmes, mode clair/sombre, police, taille (⚙) ──
const THEMES=[['ops','Ops','#39ff88','#22d3ee'],['ambre','Ambre','#ffb000','#ff7a00'],['glace','Glace','#7dd3fc','#38bdf8'],['synth','Synth','#ff2fbf','#a78bfa'],['mono','Mono','#ffffff','#b3b3b3']];
const POLICES=[['JetBrains Mono','"JetBrains Mono","Hack","SF Mono",Menlo,monospace'],['Hack','"Hack","JetBrains Mono",Menlo,monospace'],['Space Mono','"Space Mono","JetBrains Mono",Menlo,monospace'],['SF Mono','"SF Mono","JetBrains Mono",Menlo,monospace'],['Menlo','Menlo,"JetBrains Mono",monospace'],['Go Mono','"Go Mono for Powerline","JetBrains Mono",Menlo,monospace']];
const TAILLES=[11,12,13,14,15,16];
const H=document.documentElement;
const reg={theme:localStorage.getItem('theme')||'ops',mode:localStorage.getItem('mode')||'dark',police:localStorage.getItem('police')||POLICES[0][1],taille:parseInt(localStorage.getItem('taille'))||13};
function appliquerReglages(){
  H.dataset.theme=reg.theme;H.dataset.mode=reg.mode;H.style.setProperty('--mono',reg.police);
  localStorage.setItem('theme',reg.theme);localStorage.setItem('mode',reg.mode);localStorage.setItem('police',reg.police);localStorage.setItem('taille',reg.taille);
  $('bmode').textContent=reg.mode==='light'?'☀':'☾';
  for(const k in terms){const t=terms[k];t.term.options.theme=themeXterm();t.term.options.fontFamily=reg.police;t.term.options.fontSize=reg.taille;ajusterUn(t,true);}
  rendreReglages();
}
function cssv(n){return getComputedStyle(H).getPropertyValue(n).trim();}
function themeXterm(){
  const clair=reg.mode==='light';
  const ansi=clair?{black:'#1f2933',red:'#c62828',green:'#0a7f45',yellow:'#9a6700',blue:'#1d4ed8',magenta:'#7e22ce',cyan:'#0e7490',white:'#52606d',
    brightBlack:'#7b8794',brightRed:'#d32f2f',brightGreen:'#0a9f5a',brightYellow:'#b45309',brightBlue:'#2563eb',brightMagenta:'#9333ea',brightCyan:'#0891b2',brightWhite:'#1f2933'}
   :{black:'#0d151d',red:'#ff4d6d',green:'#39ff88',yellow:'#ffd166',blue:'#58a6ff',magenta:'#c084fc',cyan:'#22d3ee',white:'#d9e3ea',
    brightBlack:'#4c6070',brightRed:'#ff6b85',brightGreen:'#6dffa6',brightYellow:'#ffe08a',brightBlue:'#7cbaff',brightMagenta:'#d3a4ff',brightCyan:'#67e3f5',brightWhite:'#ffffff'};
  return Object.assign({background:cssv('--bg'),foreground:cssv('--tx'),cursor:cssv('--ac'),cursorAccent:cssv('--bg'),selectionBackground:cssv('--ac')+'33'},ansi);
}
function rendreReglages(){
  const r=$('reglages');
  for(const m of r.querySelectorAll('[data-mode]')){m.classList.toggle('on',m.dataset.mode===reg.mode);m.onclick=()=>{reg.mode=m.dataset.mode;appliquerReglages();};}
  const th=$('themes');th.innerHTML='';for(const [id,nom,c1,c2] of THEMES){const e=document.createElement('span');e.className='th'+(reg.theme===id?' on':'');e.innerHTML='<span class="p" style="background:'+c1+'"></span><span class="p2" style="background:'+c2+'"></span>'+nom;e.onclick=()=>{reg.theme=id;appliquerReglages();};th.appendChild(e);}
  const po=$('polices');po.innerHTML='';for(const [nom,pile] of POLICES){const e=document.createElement('span');e.className='th police'+(reg.police===pile?' on':'');e.textContent=nom;e.style.fontFamily=pile;e.onclick=()=>{reg.police=pile;appliquerReglages();};po.appendChild(e);}
  const ta=$('tailles');ta.innerHTML='';for(const n of TAILLES){const e=document.createElement('span');e.className='th'+(reg.taille===n?' on':'');e.textContent=n;e.onclick=()=>{reg.taille=n;appliquerReglages();};ta.appendChild(e);}
}
function basculerMode(){reg.mode=reg.mode==='light'?'dark':'light';appliquerReglages();}
function basculerReglages(){const r=$('reglages');r.hidden=!r.hidden;$('breg').classList.toggle('on',!r.hidden);if(!r.hidden)rendreReglages();}
document.addEventListener('mousedown',e=>{const r=$('reglages');if(!r.hidden&&!r.contains(e.target)&&!$('breg').contains(e.target))basculerReglages();});
H.dataset.theme=reg.theme;H.dataset.mode=reg.mode;H.style.setProperty('--mono',reg.police);$('bmode').textContent=reg.mode==='light'?'☀':'☾';   // les terminaux n'existent pas encore : appliquerReglages() vient avec le premier réglage
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
  rendreTerms(e.terminaux);      // fixe `actif` avant de filtrer les livrables
  rendreLivrables();
  rendreHud(e);
}
function rendreHud(e){
  const n=(e.terminaux||[]).length, ia=(e.terminaux||[]).filter(t=>t.claude).length;
  $('s-chats').textContent=String(n).padStart(2,'0');$('s-ia').textContent=String(ia).padStart(2,'0');
  $('s-charge').textContent=(e.charge!=null?e.charge.toFixed(2):'·');
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
  if(!s)return 'chat fermé';return ((t&&t.titre)||s.titre||('Terminal '+tid)).replace(/^[✳✶✻✽●○◐◑◒◓⚡]\s*/,'').slice(0,18);}
function rendreLivrables(){
  const liste=histo.filter(h=>h.terminal===actif);
  const a=affiche();
  let nouveau=false;
  for(const h of histo)if(h.terminal===actif&&!vus.has(h.id)){vus.add(h.id);nouveau=true;}
  const cle=JSON.stringify([liste.map(h=>[h.id,h.nom]),a&&a.id]);
  if(cle!==cleLivr){cleLivr=cle;const ong=$('onglets');ong.innerHTML='';
    for(const h of liste){const s=document.createElement('span');s.className='o'+(a&&h.id===a.id?' on':'');
      s.appendChild(document.createTextNode(h.nom));s.title=h.cible;
      const x=document.createElement('span');x.className='fx';x.textContent='✕';x.title='Fermer ce livrable';
      x.onclick=ev=>{ev.stopPropagation();fermerLivrable(h.id);};s.appendChild(x);
      s.onclick=()=>{courants[actif]=h.id;fetch('/aller/'+h.id);rendreLivrables();};ong.appendChild(s);}}
  const vue=a&&a.vue||'';
  if(vue!==srcCadre){srcCadre=vue;const c=$('cadre'),v=$('vide');
    if(vue){c.hidden=false;v.hidden=true;c.src=vue;}else{c.hidden=true;v.hidden=false;c.src='about:blank';}}
  $('vide').textContent=liste.length?'Choisis un livrable dans la barre':'Aucun livrable dans ce chat';
  if(nouveau&&vue)deplier();      // un livrable neuf dans le chat actif rouvre le volet
  if(nouveau)rendreTerms();
}
function fermerLivrable(id){histo=histo.filter(h=>h.id!==id);for(const k in courants)if(courants[k]===id){const n=histo.find(h=>h.terminal===k);if(n)courants[k]=n.id;else delete courants[k];}
  rendreLivrables();fetch('/fermer-livrable/'+id).catch(()=>{});}
// un lien cliqué dans le chat s'affiche dans les livrables de ce chat, jamais dans un navigateur à part
function voirIci(u,t){fetch('/voir',{method:'POST',body:JSON.stringify({cible:u,terminal:t&&t.id})}).then(()=>{deplier();etat();}).catch(()=>{});}
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
  if(glisse==='h'){const h=Math.max(80,Math.min(window.innerHeight-190,e.clientY-34));$('haut').style.height=h+'px';}
  else if(glisse==='c'){const w=Math.max(120,Math.min(520,e.clientX));cote.style.width=w+'px';}
  else{const w=Math.max(280,Math.min(900,window.innerWidth-e.clientX));mon.style.width=w+'px';}
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
  const t={id,term,fit,div,ws:null,titre:'',vivant:true,ouvert:false,taille:'',minuteur:null,titreMin:null};
  term.onTitleChange(x=>{t.titre=x;rendreTerms();
    clearTimeout(t.titreMin);t.titreMin=setTimeout(()=>fetch('/terminaux/'+id+'/titre',{method:'POST',body:JSON.stringify({titre:x})}).catch(()=>{}),400);});   // le moniteur à part connaît le nom du chat
  // ⌘↵ ou ⇧↵ : retour à la ligne dans le chat Claude (séquence Meta+Entrée, comprise sans /terminal-setup)
  term.attachCustomKeyEventHandler(e=>{
    if(e.type==='keydown'&&e.key==='Enter'&&(e.metaKey||e.shiftKey)){envoyer(t,enc.encode('\x1b\r'));return false;}
    if(e.metaKey&&['k','t','w','b','l','j','n','1','2','3','4','5','6','7','8','9'].includes(e.key.toLowerCase()))return false;  // raccourcis OS KADANS
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
  for(const k in terms)terms[k].div.hidden=(k!==id);
  ouvrirVue(terms[id]);requestAnimationFrame(()=>{ajusterUn(terms[id],true);terms[id].term.focus();});rendreTerms();localStorage.setItem('actif',id);
  fetch('/terminaux/actif',{method:'POST',body:JSON.stringify({id})}).catch(()=>{});   // un `voir` venu d'ailleurs se range dans ce chat
  if(vus)rendreLivrables();
  if(moniteur)moniteur.suivre();
}
let listeServeur=[], cleTerms='', creation=false, glisseTerm=null, ordreLocal=0, premier=PARAMS.get('terminal');
function rendreTerms(liste){
  if(liste){const maintenant=Date.now();for(const [k,d] of fermes)if(maintenant-d>5000)fermes.delete(k);
    liste=liste.filter(s=>!fermes.has(s.id));
    if(Date.now()-ordreLocal<3000){const pos={};listeServeur.forEach((s,i)=>pos[s.id]=i);liste.sort((a,b)=>(pos[a.id]??1e9)-(pos[b.id]??1e9));}   // un déplacement local prime le temps que le serveur suive
    listeServeur=liste;}
  for(const s of listeServeur)if(!terms[s.id])creerVue(s.id);
  for(const k in terms)if(!listeServeur.find(s=>s.id===k)){const t=terms[k];delete terms[k];try{if(t.ws){t.ws.onclose=null;t.ws.close();}t.term.dispose();}catch(x){}t.div.remove();if(actif===k)actif=null;}
  if(!actif&&listeServeur.length){const m=premier||localStorage.getItem('actif');premier=null;activer(m in terms?m:listeServeur[0].id);}
  if(liste&&!listeServeur.length&&!creation)nouveau();   // plus aucun terminal (exit partout) : on en rouvre un
  const act=(serveur.activite&&serveur.activite.par_terminal)||{};
  const lignes=listeServeur.map((s,i)=>{const t=terms[s.id];
    return {id:s.id,num:String(i+1).padStart(2,'0'),titre:((t&&t.titre)||s.titre||('Terminal '+s.id)).replace(/^[✳✶✻✽●○◐◑◒◓⚡]\s*/,''),sous:(t&&!t.vivant)?'fermé':s.cwd,on:s.id===actif,
      ia:s.claude?(act[s.id]?'trav':'on'):'',
      nouveau:!!vus&&s.id!==actif&&histo.some(h=>h.terminal===s.id&&!vus.has(h.id))};});
  const cle=JSON.stringify(lignes);if(cle===cleTerms)return;cleTerms=cle;
  const ong=$('onglets-term');ong.innerHTML='';
  for(const l of lignes){const d=document.createElement('div');d.className='t'+(l.on?' on':'')+(l.nouveau?' nouveau':'');
    d.innerHTML='<span class="pt" title="Nouveau livrable dans ce chat"></span><span class="titre"><span class="num"></span><span class="ia"></span><span class="tx"></span></span><span class="sous"></span><span class="x" title="Fermer">✕</span>';
    d.querySelector('.num').textContent=l.num;d.querySelector('.tx').textContent=l.titre;d.querySelector('.sous').textContent=l.sous;
    const ia=d.querySelector('.ia');ia.className='ia '+l.ia;ia.title=l.ia==='trav'?'Claude travaille':l.ia==='on'?'Claude en attente':'shell';
    d.onclick=()=>{if(!aGlisse)activer(l.id);};d.querySelector('.x').onclick=ev=>{ev.stopPropagation();fermer(l.id);};
    d.dataset.id=l.id;
    d.onmousedown=ev=>{if(ev.button!==0||ev.target.classList.contains('x'))return;aGlisse=false;presse={id:l.id,x:ev.clientX,y:ev.clientY,el:d};};
    ong.appendChild(d);}
}
// ── ordre des onglets : on presse, on bouge de 5 px, on lâche où on veut (souris, comme dans Warp) ──
let presse=null;
function sousSouris(ev){const el=document.elementFromPoint(ev.clientX,ev.clientY);const t=el&&el.closest('#onglets-term .t');if(t)return t;return el&&el.closest('#onglets-term')?'fin':null;}
document.addEventListener('mousemove',ev=>{
  if(!presse)return;
  if(!glisseTerm){if(Math.abs(ev.clientX-presse.x)+Math.abs(ev.clientY-presse.y)<5)return;glisseTerm=presse.id;presse.el.classList.add('glisse');document.body.style.cursor='grabbing';}
  const c=sousSouris(ev);
  if(c==='fin')marquer('fin');else if(c&&c.dataset.id!==glisseTerm)marquer(c,avantOuApres(c,ev));else marquer(null,null,true);
});
document.addEventListener('mouseup',ev=>{
  if(!presse)return;
  const p=presse;presse=null;
  if(!glisseTerm)return;                         // simple clic : onclick fait le travail
  const c=sousSouris(ev);const id=glisseTerm;glisseTerm=null;document.body.style.cursor='';
  marquer(null);p.el.classList.remove('glisse');
  if(c==='fin')deplacer(id,null,false);else if(c&&c.dataset.id!==id)deplacer(id,c.dataset.id,avantOuApres(c,ev)==='avant');
  aGlisse=true;setTimeout(()=>aGlisse=false,0);
},true);
let aGlisse=false;
$('onglets-term').addEventListener('click',ev=>{if(aGlisse){ev.stopPropagation();ev.preventDefault();}},true);
function avantOuApres(d,ev){const r=d.getBoundingClientRect();return ev.clientY<r.top+r.height/2?'avant':'apres';}
function marquer(el,pos,garder){for(const x of document.querySelectorAll('#onglets-term .t')){x.classList.remove('avant','apres');if(!el&&!garder)x.classList.remove('glisse');}$('onglets-term').classList.toggle('fin',el==='fin');if(el&&el!=='fin')el.classList.add(pos);}
function deplacer(src,cible,avant){
  if(!src||src===cible)return;
  const s=listeServeur.find(x=>x.id===src);if(!s)return;
  const l=listeServeur.filter(x=>x.id!==src);
  let i=cible===null?l.length:l.findIndex(x=>x.id===cible);if(i<0)i=l.length;else if(!avant)i++;
  l.splice(i,0,s);listeServeur=l;ordreLocal=Date.now();cleTerms='';rendreTerms();
  fetch('/terminaux/ordre',{method:'POST',body:JSON.stringify({ordre:l.map(x=>x.id)})}).catch(()=>{});
}
async function nouveau(){
  if(creation)return;creation=true;
  try{const r=await fetch('/terminaux/nouveau',{method:'POST'});const d=await r.json();
    if(!listeServeur.find(s=>s.id===d.id))listeServeur.push(d);rendreTerms();activer(d.id);}
  catch(x){}finally{creation=false;}
}
async function fermer(id){
  fermes.set(id,Date.now());
  const idx=listeServeur.findIndex(s=>s.id===id);
  listeServeur=listeServeur.filter(s=>s.id!==id);
  if(actif===id)actif=null;
  rendreTerms();
  try{await fetch('/terminaux/'+id+'/fermer');}catch(x){}
  if(!listeServeur.length)nouveau();else if(!actif)activer(listeServeur[Math.max(0,Math.min(idx,listeServeur.length-1))].id);
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
  if(!e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key.toLowerCase();
  if(k==='k'&&actif){terms[actif].term.clear();e.preventDefault();}
  else if(k==='t'){nouveau();e.preventDefault();}
  else if(k==='n'){nouvelleFenetre();e.preventDefault();}
  else if(k==='w'){if(actif)fermer(actif);e.preventDefault();}
  else if(k==='b'){const c=$('cote');c.hidden=!c.hidden;$('sepc').hidden=c.hidden;ajuster();e.preventDefault();}
  else if(k==='f'&&e.shiftKey){basculerPlein();e.preventDefault();}
  else if(k==='l'){if(e.shiftKey){const a=affiche();if(a)fermerLivrable(a.id);}else basculer();e.preventDefault();}
  else if(k==='j'){if(e.shiftKey)fenetreMoniteur();else montrerMoniteur(mon.hidden,true);e.preventDefault();}
  else if(k==='v'&&e.shiftKey){basculerJarvis();e.preventDefault();}
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
document.addEventListener('dragover',e=>{e.preventDefault();zone.style.outline='2px solid #39ff88';zone.style.outlineOffset='-2px';});
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
