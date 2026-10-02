// Jeton de l'API OS KADANS (meta posée par le serveur) : ajouté à chaque fetch vers le serveur de la page, jamais ailleurs.
(function(){
  const m=document.querySelector('meta[name="jeton"]'); if(!m) return;
  const j=m.content, f0=window.fetch.bind(window); window.JETON_OSROM=j;
  window.fetch=function(u,o){
    o=Object.assign({},o||{});
    try{const url=new URL(u instanceof Request?u.url:u,location.href);
      if(url.origin===location.origin){const h=new Headers(o.headers||(u instanceof Request?u.headers:{}));h.set('X-Jeton',j);o.headers=h;}}catch(x){}
    return f0(u,o);
  };
})();
// Espace (30/09/2026) : thème, mode (sombre, clair, auto), accent, polices, taille, densité. Appliqués avant le rendu
// (dans <head>) pour éviter un flash, sur toutes les pages OS KADANS. Même catalogue que le CRM.
// window.ESPACE : le catalogue, lire(), ecrire(reglages), appliquer(reglages). Un changement fait dans une fenêtre
// (panneau ⚙) s'applique aux autres (événement storage) ; l'événement `espace` prévient la page (xterm, fond animé).
(function(){
  const H=document.documentElement;
  const THEMES=[['kadans','Kadans','#3B82F6','#8DB5FF'],['ops','Ops','#39ff88','#22d3ee'],['ambre','Ambre','#ffb000','#ff7a00'],['glace','Glace','#7dd3fc','#38bdf8'],
    ['synth','Synth','#ff2fbf','#a78bfa'],['mono','Mono','#ffffff','#b3b3b3'],['metro','Métro','#FF4A1C','#FF9A1F']];
  // vignettes du panneau : [fond, texte, accent, accent 2] en sombre puis en clair
  const VIGNETTES={kadans:[['#0E0E0E','#F5F5F2','#3B82F6','#8DB5FF'],['#EDEDED','#0A0A0A','#2563EB','#1D4ED8']],ops:[['#04070a','#c4d2dc','#39ff88','#22d3ee'],['#f4f6f8','#17232d','#0a9f5a','#0891b2']],
    ambre:[['#0a0700','#e8d5a8','#ffb000','#ff7a00'],['#faf6ee','#2a2110','#b45309','#d97706']],glace:[['#03070f','#d6e6f7','#7dd3fc','#38bdf8'],['#f2f7fc','#0f2237','#0369a1','#0284c7']],
    synth:[['#07030f','#e9dcff','#ff2fbf','#a78bfa'],['#f8f4fc','#241536','#be185d','#7c3aed']],mono:[['#000000','#e6e6e6','#ffffff','#b3b3b3'],['#fafafa','#111111','#111111','#555555']],
    metro:[['#111114','#F4F1EA','#FF4A1C','#FF9A1F'],['#F3EFE6','#111114','#E63E12','#D9820F']]};
  const ACCENTS=[['#3B82F6','bleu'],['#22C55E','vert'],['#FF4A1C','orange'],['#EC4899','rose'],['#8B5CF6','violet'],['#06B6D4','cyan'],['#EAB308','jaune'],['#EF4444','rouge']];
  const POLICES=[['JetBrains Mono','"JetBrains Mono","Hack","SF Mono",Menlo,monospace'],['Hack','"Hack","JetBrains Mono",Menlo,monospace'],
    ['Space Mono','"Space Mono","Space Mono for Powerline","JetBrains Mono",Menlo,monospace'],['SF Mono','"SF Mono",ui-monospace,"JetBrains Mono",Menlo,monospace'],
    ['Menlo','Menlo,"JetBrains Mono",monospace'],['Go Mono','"Go Mono for Powerline","Go Mono","JetBrains Mono",Menlo,monospace']];
  const TEXTES=[['','Comme le mono'],['"Nunito",-apple-system,BlinkMacSystemFont,sans-serif','Nunito'],['"Inter","Inter Variable",-apple-system,BlinkMacSystemFont,sans-serif','Inter'],
    ['-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif','Système']];
  const ZOOMS=[90,100,110,120], TAILLES=[11,12,13,14,15,16];
  const DEFAUT={theme:'ops',mode:'dark',accent:'',police:POLICES[0][1],police_texte:'',zoom:100,taille:13,densite:'confort'};
  const CLES=['theme','mode','accent','police','police_texte','zoom','taille','densite'];
  const ls=(k)=>{try{return localStorage.getItem(k);}catch(x){return null;}};
  // une pile de polices enregistrée avant le 30/09 se retrouve par son premier nom (les piles ont gagné des replis)
  const premier=s=>(s||'').split(',')[0].replace(/["']/g,'').trim().toLowerCase();
  function lire(){
    const r=Object.assign({},DEFAUT);
    const t=ls('theme');if(THEMES.some(x=>x[0]===t))r.theme=t;
    const m=ls('mode');if(m==='dark'||m==='light'||m==='auto')r.mode=m;
    const a=ls('accent');if(/^#[0-9a-f]{6}$/i.test(a||''))r.accent=a;
    const p=ls('police');if(p){const f=POLICES.find(x=>premier(x[1])===premier(p));r.police=f?f[1]:p;}
    const pt=ls('police_texte');if(pt&&TEXTES.some(x=>x[0]===pt))r.police_texte=pt;
    const z=parseInt(ls('zoom'));if(ZOOMS.includes(z))r.zoom=z;
    const ta=parseInt(ls('taille'));if(TAILLES.includes(ta))r.taille=ta;
    if(ls('densite')==='compacte')r.densite='compacte';
    return r;
  }
  function ecrire(r){try{for(const k of CLES){const v=r[k];if(v===''||v==null||v===DEFAUT[k]&&k!=='mode'&&k!=='theme')localStorage.removeItem(k);else localStorage.setItem(k,String(v));}}catch(x){}}
  const clairSysteme=()=>!!(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches);
  function hexRgb(h){h=h.replace('#','');if(h.length===3)h=h.replace(/./g,c=>c+c);const n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255];}
  // texte posé sur l'accent : noir ou blanc selon sa luminance (un jaune ou un cyan veulent du noir)
  function surAccent(h){const [r,g,b]=hexRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b>.36?'#0b0b0d':'#ffffff';}
  function appliquer(r){
    r=r||lire();
    H.dataset.theme=r.theme;
    const clair=r.mode==='auto'?clairSysteme():r.mode==='light';
    H.dataset.mode=clair?'light':'dark';H.dataset.modeChoix=r.mode;
    H.dataset.densite=r.densite;
    const s=H.style;
    s.setProperty('--mono',r.police);
    if(r.police_texte)s.setProperty('--texte',r.police_texte);else s.removeProperty('--texte');
    s.setProperty('--zoom',String(r.zoom/100));
    if(r.accent){const [a,b,c]=hexRgb(r.accent);
      s.setProperty('--ac',r.accent);s.setProperty('--acf',`rgba(${a},${b},${c},${clair?.1:.13})`);
      s.setProperty('--glow',clair?`0 0 8px rgba(${a},${b},${c},.25)`:`0 0 10px rgba(${a},${b},${c},.38)`);s.setProperty('--on-ac',surAccent(r.accent));}
    else for(const k of ['--ac','--acf','--glow','--on-ac'])s.removeProperty(k);
    return r;
  }
  function prevenir(){try{document.dispatchEvent(new CustomEvent('espace'));}catch(x){}}
  window.ESPACE={THEMES,VIGNETTES,ACCENTS,POLICES,TEXTES,ZOOMS,TAILLES,DEFAUT,lire,ecrire,appliquer,prevenir};
  try{appliquer();}catch(x){}
  if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: light)');
    const suivre=()=>{if(lire().mode==='auto'){appliquer();prevenir();}};
    if(mq.addEventListener)mq.addEventListener('change',suivre);else if(mq.addListener)mq.addListener(suivre);}
  window.addEventListener('storage',e=>{if(e.key===null||CLES.includes(e.key)){appliquer();prevenir();}});
})();
