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
// Thème, mode et police : appliqués avant le rendu (dans <head>) pour éviter un flash. Partagé par toutes les pages OS KADANS.
(function(){
  const h=document.documentElement;
  try{
    h.dataset.theme=localStorage.getItem('theme')||'ops';
    h.dataset.mode=localStorage.getItem('mode')||'dark';
    const p=localStorage.getItem('police');if(p)h.style.setProperty('--mono',p);
  }catch(x){}
})();
