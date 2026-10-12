// Animação de abertura (logo, título e autor). Some sozinha depois de INTRO_MS ou com clique, toque ou tecla.
// Carregado logo depois do HTML, antes do Three.js, para aparecer enquanto o resto carrega.
'use strict';

(function(){
  const el=document.getElementById('intro');
  if(!el)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTRO_MS=reduce?900:3300;
  let done=false;
  function sair(){
    if(done)return;done=true;
    el.classList.add('fora');
    setTimeout(()=>el.remove(),700);
    document.dispatchEvent(new CustomEvent('intro-fim'));
  }
  setTimeout(sair,INTRO_MS);
  el.addEventListener('pointerdown',sair);
  addEventListener('keydown',sair,{once:true});
})();
