// Medidor de desempenho, laço principal, tour e inicialização.
// Parte do simulador Evolução. Scripts clássicos (sem build): a ordem de carregamento está no index.html
// e as declarações de nível superior são compartilhadas entre os arquivos.
'use strict';

// ===== Medidor de desempenho (?debug=1) =====
// Sem o parâmetro, o único custo é testar a constante DEBUG algumas vezes por quadro.
const DEBUG=/[?&]debug=1(&|$)/.test(location.search);
const dbg=DEBUG?{el:null,n:0,t0:performance.now(),sim:0,scene:0,rend:0,steps:0,calls:0,tris:0}:null;
if(DEBUG){dbg.el=document.createElement('div');dbg.el.id='dbg';dbg.el.setAttribute('aria-hidden','true');document.body.appendChild(dbg.el);renderer.info.autoReset=false;}
function dbgFrame(tSim,tScene,tRend,steps){
  dbg.n++;dbg.sim+=tSim;dbg.scene+=tScene;dbg.rend+=tRend;dbg.steps+=steps;dbg.calls+=renderer.info.render.calls;dbg.tris+=renderer.info.render.triangles;
  const now=performance.now(),el=now-dbg.t0;if(el<500)return;
  const n=dbg.n,f=v=>(v/n).toFixed(2).padStart(6);
  dbg.el.textContent=`FPS          ${(n*1000/el).toFixed(1).padStart(6)}\nquadro (ms)  ${(el/n).toFixed(1).padStart(6)}\nmotor (ms)   ${f(dbg.sim)}  ${(dbg.steps/n).toFixed(1)} passos\ncena (ms)    ${f(dbg.scene)}\nrender (ms)  ${f(dbg.rend)}  CPU\ndraw calls   ${String(Math.round(dbg.calls/n)).padStart(6)}\ntriângulos   ${String(Math.round(dbg.tris/n)).padStart(6)}\ncriaturas    ${String(World.creatures.length).padStart(6)}\nDPR ${renderer.getPixelRatio().toFixed(2)}  bloom ${composer&&bloomOn?'sim':'não'}\nqualidade ${QL[qLevel].name}${qAuto?' (auto)':''}`;
  Object.assign(dbg,{n:0,t0:now,sim:0,scene:0,rend:0,steps:0,calls:0,tris:0});
}

// ===== Loop principal =====
let last=performance.now(),acc=0,frameN=0;
function frame(now){
  qualityTick(now-last);
  const rdt=Math.min(0.05,(now-last)/1000);last=now;T+=rdt;
  const p0=DEBUG?performance.now():0;let k=0;
  if(!paused&&World.phase!=='over'){
    acc+=rdt*simSpeed;
    while(acc>=SUB&&k<60){step(SUB);acc-=SUB;k++;}
    if(k>=60)acc=0;
  }
  const p1=DEBUG?performance.now():0;
  updateScene(rdt);
  if(auto)camAz+=rdt*0.05;
  if(modoLivre)CamLivre.atualizar(rdt);else placeCam();
  if(selected){
    if(selected.state==='dead'&&selected.vis<0.02){selected=null;showInfo();}
    else{
      const c=selected,rb=0.7*c.size;
      selRing.position.set(c.x,0.07+(c.gy||0),c.z);selRing.scale.setScalar(rb*1.5+0.4);
      senseDisc.position.set(c.x,0.05+(c.gy||0),c.z);senseDisc.scale.setScalar(4*c.sense);selR(true);
      if(frameN%6===0)showInfo();
    }
  }
  if(frameN%8===0)updateHUD();
  frameN++;
  const p2=DEBUG?performance.now():0;if(DEBUG)renderer.info.reset();
  if(composer&&bloomOn)composer.render();else renderer.render(scene,camera);
  if(DEBUG)dbgFrame(p1-p0,p2-p1,performance.now()-p2,k);
  requestAnimationFrame(frame);
}

const TOUR=[['Bem-vindo à ilha','Cada bolinha é uma criatura. Todo dia nascem frutas e elas saem da areia para buscar comida.'],['Quem come, deixa filhos','Voltou com 2 frutas: tem um filho. Com 1 fruta: sobrevive. Sem fruta: morre. Os filhos nascem com mutações.'],['Mude o mundo','Use os eventos (frio, calor, seca, meteoro) e veja a população evoluir. Toque numa criatura para ver os genes dela.']];
let tourI=0;
function tourShow(){const t=TOUR[tourI];$('tT').textContent=t[0];$('tP').textContent=t[1];$('tNext').textContent=tourI===TOUR.length-1?'Começar':'Próximo';$('tour').classList.add('show');}
$('tNext').addEventListener('click',()=>{tourI++;if(tourI>=TOUR.length){$('tour').classList.remove('show');setPaused(false);try{localStorage.setItem('evo_tour','1');}catch(e){}}else tourShow();});
$('tSkip').addEventListener('click',()=>{tourI=TOUR.length-1;$('tNext').click();});
{ // nível inicial: escolha salva, ou Média no celular e Alta no computador
  let saved=null;try{saved=localStorage.getItem('evo_quality');}catch(e){}
  if(saved&&['auto','0','1','2'].includes(saved))$('quality').value=saved;
  qAuto=$('quality').value==='auto';
  applyQuality(qAuto?(mqMobile.matches?1:2):+$('quality').value);
}
setInputs(DEF);
resize();
doReset();
applyTerrain();
let seen=false;try{seen=!!localStorage.getItem('evo_tour');}catch(e){}
if(!seen){setPaused(true);tourShow();}
requestAnimationFrame(frame);
