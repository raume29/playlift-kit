// Ambiance de focus (26/09/2026) : fond animé de la zone des livrables, aux couleurs du thème.
// Cinq scènes lentes qui se relaient en fondu (respiration, flux, constellation, ondes, aurore).
// Léger : 30 i/s au plus, arrêt quand la zone est cachée ou la fenêtre en arrière-plan. Réglage ⚙ › Fond animé.
(function(){
  const zone=document.getElementById('vide'); if(!zone) return;
  const cv=document.createElement('canvas'); cv.id='ambiance'; zone.prepend(cv);
  const cx=cv.getContext('2d');
  const H=document.documentElement;
  let W=0,Hh=0,dpr=1,coul={a:[57,255,136],b:[34,211,238],c:[192,132,252],fond:[4,7,10]},clair=false;
  const DUREE=48000, FONDU=5000;           // une scène ≈ 48 s, fondu de 5 s
  let actif=true; try{actif=localStorage.getItem('ambiance')!=='0';}catch(x){}

  function rgb(v){v=(v||'').trim();
    if(v[0]==='#'){if(v.length===4)v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3];const n=parseInt(v.slice(1,7),16);return [n>>16&255,n>>8&255,n&255];}
    const m=v.match(/\d+(\.\d+)?/g);return m?m.slice(0,3).map(Number):[128,128,128];}
  function lireCouleurs(){const s=getComputedStyle(H);
    coul={a:rgb(s.getPropertyValue('--ac')),b:rgb(s.getPropertyValue('--ac2')),c:rgb(s.getPropertyValue('--vi')),fond:rgb(s.getPropertyValue('--bg2'))};
    clair=H.dataset.mode==='light';}
  function c(k,al){const [r,g,b]=coul[k];return `rgba(${r},${g},${b},${al*(clair?.8:1)})`;}
  function taille(){const r=zone.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);
    W=Math.max(1,r.width);Hh=Math.max(1,r.height);cv.width=W*dpr;cv.height=Hh*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
    for(const s of SCENES)s.init&&s.init();}

  // ── scènes : dessin(t en s, alpha 0..1) ──
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const SCENES=[
    { nom:'respiration',          // cohérence : 5 s inspire, 5 s expire
      dessin(t,al){const m=Math.min(W,Hh),x=W/2,y=Hh/2,ph=(Math.sin(t*Math.PI/5-Math.PI/2)+1)/2,r=m*(.12+.16*ph);
        for(let i=4;i>=1;i--){cx.beginPath();cx.arc(x,y,r*(1+i*.28),0,7);cx.strokeStyle=c(i%2?'b':'a',al*.07/i);cx.lineWidth=1;cx.stroke();}
        const g=cx.createRadialGradient(x,y,0,x,y,r*1.4);g.addColorStop(0,c('a',al*.16));g.addColorStop(.6,c('b',al*.06));g.addColorStop(1,c('b',0));
        cx.fillStyle=g;cx.beginPath();cx.arc(x,y,r*1.4,0,7);cx.fill();
        cx.beginPath();cx.arc(x,y,r,0,7);cx.strokeStyle=c('a',al*.35);cx.lineWidth=1.2;cx.stroke();
        const txt=(t%10)<5?'inspire':'expire';cx.font='10px '+(getComputedStyle(H).getPropertyValue('--mono')||'monospace');
        cx.textAlign='center';cx.fillStyle=c('b',al*.35);cx.fillText(txt.toUpperCase().split('').join(' '),x,y+r+m*.14);}},
    { nom:'flux', pts:[],
      init(){this.pts=Array.from({length:Math.round(W*Hh/5000)+40},()=>({x:rnd(0,W),y:rnd(0,Hh),v:rnd(.3,.8)}));},
      dessin(t,al){for(const p of this.pts){const a=Math.sin(p.x*.004+t*.05)*Math.cos(p.y*.005-t*.04)*Math.PI*1.5,dx=Math.cos(a)*p.v,dy=Math.sin(a)*p.v;
          cx.beginPath();cx.moveTo(p.x,p.y);p.x+=dx;p.y+=dy;cx.lineTo(p.x-dx*14,p.y-dy*14);cx.strokeStyle=c(p.v>.55?'a':'b',al*.18);cx.lineWidth=1;cx.stroke();
          if(p.x<-20||p.x>W+20||p.y<-20||p.y>Hh+20){p.x=rnd(0,W);p.y=rnd(0,Hh);}}}},
    { nom:'constellation', pts:[],
      init(){this.pts=Array.from({length:Math.round(W*Hh/14000)+18},()=>({x:rnd(0,W),y:rnd(0,Hh),vx:rnd(-.12,.12),vy:rnd(-.12,.12),r:rnd(.8,1.8)}));},
      dessin(t,al){const P=this.pts,D=Math.min(160,Math.max(W,Hh)/5);
        for(const p of P){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>Hh)p.vy*=-1;}
        for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y);
          if(d<D){cx.beginPath();cx.moveTo(P[i].x,P[i].y);cx.lineTo(P[j].x,P[j].y);cx.strokeStyle=c('b',al*.14*(1-d/D));cx.lineWidth=1;cx.stroke();}}
        for(const [k,p] of P.entries()){const s=.5+.5*Math.sin(t*.8+k);cx.beginPath();cx.arc(p.x,p.y,p.r,0,7);cx.fillStyle=c('a',al*(.25+.3*s));cx.fill();}}},
    { nom:'ondes', src:[],
      init(){this.src=[[.3,.4],[.7,.62],[.5,.25]];},
      dessin(t,al){const m=Math.max(W,Hh);
        this.src.forEach(([fx,fy],k)=>{const x=W*(fx+.04*Math.sin(t*.1+k)),y=Hh*(fy+.04*Math.cos(t*.12+k));
          for(let i=0;i<6;i++){const ph=((t*.06+i/6+k*.33)%1),r=ph*m*.55;
            cx.beginPath();cx.arc(x,y,r,0,7);cx.strokeStyle=c(['a','b','c'][k],al*.22*Math.sin(ph*Math.PI));cx.lineWidth=1;cx.stroke();}});}},
    { nom:'aurore',
      dessin(t,al){for(let k=0;k<3;k++){const col=['a','b','c'][k];cx.beginPath();
          for(let x=0;x<=W;x+=8){const y=Hh*(.35+k*.15)+Math.sin(x*.006+t*.18+k*2)*Hh*.08+Math.sin(x*.013-t*.11+k)*Hh*.04;x?cx.lineTo(x,y):cx.moveTo(x,y);}
          cx.lineTo(W,Hh);cx.lineTo(0,Hh);cx.closePath();
          const g=cx.createLinearGradient(0,Hh*(.25+k*.15),0,Hh);g.addColorStop(0,c(col,al*.1));g.addColorStop(.35,c(col,al*.03));g.addColorStop(1,c(col,0));
          cx.fillStyle=g;cx.fill();}}},
  ];

  let debut=performance.now(),dernier=0,raf=0,ordre=[0,1,2,3,4];
  function visible(){return actif&&!document.hidden&&!zone.hidden&&zone.offsetParent!==null;}
  function image(){raf=0; if(!visible()) return;
    raf=requestAnimationFrame(image); const now=performance.now();
    if(now-dernier<33) return; dernier=now;
    const t=(now-debut)/1000,tour=(now-debut)/DUREE,i=Math.floor(tour),dans=(now-debut)%DUREE;
    cx.clearRect(0,0,W,Hh);
    const cur=SCENES[ordre[i%ordre.length]],suiv=SCENES[ordre[(i+1)%ordre.length]];
    const f=Math.max(0,(dans-(DUREE-FONDU))/FONDU);           // fondu vers la scène suivante
    const ent=Math.min(1,dans/1500);                          // entrée douce au démarrage
    cur.dessin(t,(1-f)*(i===0?ent:1)); if(f>0)suiv.dessin(t,f);
  }
  function relancer(){if(!raf&&visible()){dernier=0;raf=requestAnimationFrame(image);} if(!actif)cx.clearRect(0,0,W,Hh);}
  lireCouleurs();taille();
  new ResizeObserver(()=>{taille();relancer();}).observe(zone);
  new MutationObserver(()=>{lireCouleurs();relancer();}).observe(H,{attributes:true,attributeFilter:['data-theme','data-mode']});
  new MutationObserver(relancer).observe(zone,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',relancer);
  setInterval(relancer,2000);                                  // filet : volet replié puis déplié, plein écran…
  window.ambiance=function(on){if(on===undefined)return actif;actif=!!on;try{localStorage.setItem('ambiance',actif?'1':'0');}catch(x){}cv.hidden=!actif;relancer();};
  window.ambianceScene=n=>{debut=performance.now()-n*DUREE-2000;};   // passer à la scène n (tests)
  cv.hidden=!actif; relancer();
})();
