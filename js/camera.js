// Câmera, bloom, redimensionamento e qualidade gráfica adaptativa.
// Parte do simulador Evolução. Scripts clássicos (sem build): a ordem de carregamento está no index.html
// e as declarações de nível superior são compartilhadas entre os arquivos.
'use strict';

// ===== Câmera: arrastar gira, roda aproxima =====
let modoLivre=false; // câmera livre ativa (js/camera-livre.js): a órbita e a seleção ficam paradas
let camAz=0.7,camPol=0.95,camDist=82,zoomed=false,auto=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
$('autoRot').checked=auto;
let follow=false;const camTgt=new THREE.Vector3();
function placeCam(){
  const sp=Math.sin(camPol),tg=follow&&selected&&selected.state!=='dead'?v3.set(selected.x,selected.gy||0,selected.z):v3.set(0,-0.5,0);
  camTgt.lerp(tg,0.08);
  camera.position.set(camTgt.x+camDist*sp*Math.cos(camAz)+(Math.random()-.5)*shake*1.2,camDist*Math.cos(camPol)+(Math.random()-.5)*shake,camTgt.z+camDist*sp*Math.sin(camAz)+(Math.random()-.5)*shake*1.2);
  camera.lookAt(camTgt);
}
let composer=null,bloomOn=true;
// mode 0: sem bloom; 1: bloom com render target comum; 2: bloom com render target multisample 4×.
function initBloom(mode){
  if(composer){try{composer.renderTarget1.dispose();composer.renderTarget2.dispose();for(const ps of composer.passes)if(ps.dispose)ps.dispose();}catch(e){}composer=null;}
  if(!mode)return;
  try{
    if(!(THREE.EffectComposer&&THREE.RenderPass&&THREE.UnrealBloomPass))return;
    let rt;if(mode===2&&THREE.WebGLMultisampleRenderTarget){rt=new THREE.WebGLMultisampleRenderTarget(innerWidth,innerHeight);rt.samples=4;}
    composer=new THREE.EffectComposer(renderer,rt);composer.setPixelRatio(renderer.getPixelRatio());
    composer.addPass(new THREE.RenderPass(scene,camera));
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.32,0.5,0.9));
    composer.setSize(innerWidth,innerHeight);
  }catch(e){composer=null;}
}
$('bloom').addEventListener('change',e=>{bloomOn=e.target.checked;});
const mqMobile=matchMedia('(max-width:760px),(max-height:520px)');
function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
  if(!zoomed)camDist=clamp(Math.max(82,88/camera.aspect),28,170);
  if(w>900&&!mqMobile.matches&&!modoLivre)camera.setViewOffset(w,h,120,0,w,h);else camera.clearViewOffset();
  if(composer)composer.setSize(w,h);camera.updateProjectionMatrix();drawCharts(true);
}
addEventListener('resize',resize);

// ===== Qualidade gráfica (T-PERF-02) =====
// Três níveis. No modo automático: desce um nível se a média dos quadros passar de 40 ms por 3 s; sobe se ficar
// abaixo de 20 ms por 10 s. Depois de descer de um nível, só volta a ele após 60 s rápidos (evita oscilar).
const QL=[{name:'Baixa',dpr:1,shadow:0,bloom:0,tilt:false,seg:[12,8]},
  {name:'Média',dpr:1.5,shadow:1024,bloom:1,tilt:true,seg:[16,12]},
  {name:'Alta',dpr:2,shadow:2048,bloom:2,tilt:true,seg:[28,20]}];
let qLevel=-1,qAuto=true,qCeil=2;
const qa={t:0,n:0,slow:0,fast:0,hold:1};
function applyQuality(l){
  l=clamp(l,0,2);if(l===qLevel)return;qLevel=l;const q=QL[l];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.dpr));
  sun.castShadow=q.shadow>0;
  if(q.shadow){sun.shadow.mapSize.set(q.shadow,q.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  initBloom(q.bloom);$('bloom').disabled=!q.bloom;
  $('tilt').style.display=q.tilt?'':'none';
  bodies.geometry.dispose();bodies.geometry=new THREE.SphereGeometry(1,q.seg[0],q.seg[1]);
  Object.assign(qa,{t:0,n:0,slow:0,fast:0,hold:1});
  $('quality').options[0].textContent=`Automática (agora: ${q.name})`;
  resize();
}
function qualityTick(ms){ // ms: intervalo real entre quadros
  if(!qAuto||ms>250)return; // aba escondida ou travada: ignora
  qa.t+=ms;qa.n++;if(qa.t<500)return;
  const avg=qa.t/qa.n,win=qa.t/1000;qa.t=0;qa.n=0;
  if(qa.hold>0){qa.hold-=win;return;} // 1 s depois de cada troca (compilação de shaders)
  qa.slow=avg>40?qa.slow+win:0;qa.fast=avg<20?qa.fast+win:0;
  if(qa.slow>=3&&qLevel>0){qCeil=qLevel-1;applyQuality(qLevel-1);}
  else if(qa.fast>=10&&qLevel<qCeil)applyQuality(qLevel+1);
  else if(qa.fast>=60&&qLevel===qCeil&&qCeil<2){qCeil++;applyQuality(qLevel+1);}
}
$('quality').addEventListener('change',e=>{
  const v=e.target.value;qAuto=v==='auto';qCeil=2;if(!qAuto)applyQuality(+v);
  try{localStorage.setItem('evo_quality',v);}catch(err){}
});
const ptrs=new Map();let moved=0,pinch0=0;
canvas.addEventListener('pointerdown',e=>{
  if(modoLivre)return;
  canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;
  if(editT){undoS.push(HG.slice());if(undoS.length>20)undoS.shift();paint(e.clientX,e.clientY,e.shiftKey);}
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);}
});
canvas.addEventListener('pointermove',e=>{
  if(modoLivre)return;
  const p=ptrs.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
  if(editT&&ptrs.size===1){paint(e.clientX,e.clientY,e.shiftKey);return;}
  if(ptrs.size===1){camAz-=dx*0.006;camPol=clamp(camPol-dy*0.005,0.25,1.35);if(moved>6){auto=false;$('autoRot').checked=false;}}
  else if(ptrs.size===2){const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch0>0){camDist=clamp(camDist*pinch0/d,28,170);zoomed=true;}pinch0=d;}
});
const pointerEnd=e=>{
  if(!ptrs.has(e.pointerId))return;
  const solo=ptrs.size===1;ptrs.delete(e.pointerId);
  if(solo&&moved<6&&e.type==='pointerup'&&!editT)pick(e.clientX,e.clientY);
};
canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(modoLivre)return;camDist=clamp(camDist*Math.exp(e.deltaY*0.0012),28,170);zoomed=true;},{passive:false});
$('autoRot').addEventListener('change',e=>{auto=e.target.checked;});
