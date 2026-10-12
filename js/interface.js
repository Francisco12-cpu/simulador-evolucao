// Interface: seleção de criatura, gráficos, dados, controles e HUD.
// Parte do simulador Evolução. Scripts clássicos (sem build): a ordem de carregamento está no index.html
// e as declarações de nível superior são compartilhadas entre os arquivos.
'use strict';

// ===== Seleção de criatura =====
let selected=null;const v3=new THREE.Vector3();
function closeSheets(){
  for(const id of ['ctrl','charts'])$(id).classList.remove('open');
  $('fSet').classList.remove('on');$('fCharts').classList.remove('on');
}
function pick(px,py){
  closeSheets();
  const w=innerWidth,h=innerHeight;let best=null,bd=32*32;
  for(const c of World.creatures){
    if(c.state==='dead')continue;
    v3.set(c.x,0.6*c.size,c.z).project(camera);if(v3.z>1)continue;
    const sx=(v3.x*0.5+0.5)*w,sy=(-v3.y*0.5+0.5)*h,d=(sx-px)*(sx-px)+(sy-py)*(sy-py);
    if(d<bd){bd=d;best=c;}
  }
  selected=best;showInfo();
}
const MODE={seek:'Indo atrás de uma fruta',hunt:'Caçando',drink:'Indo beber água',flee:'Fugindo de um predador',wander:'Procurando',ret:'Voltando para casa','':'Em casa'};
// O painel é montado uma vez; depois só os valores mudam (o botão "Seguir" continua sendo o mesmo elemento,
// então um clique não se perde entre duas atualizações, e leitores de tela não releem o painel inteiro).
const IV={};
function buildInfo(){
  const kv=(id,label)=>`<div class="kv"><span>${label}</span><b id="${id}"></b></div>`;
  $('info').innerHTML=`<h4><i id="iDot"></i><span id="iName"></span></h4>`+kv('iSpeed','Velocidade')+kv('iSize','Tamanho')+kv('iSense','Visão (raio)')+
    kv('iTemp','Clima ideal')+kv('iBiome','Terreno')+kv('iCost','Gasto por segundo')+kv('iFood','Frutas')+
    `<div class="bar"><div id="iBar"></div></div>`+kv('iEnergy','Energia')+`<small id="iState"></small>
  <button class="btn sm" id="bFollow" style="width:100%;margin-top:8px"></button>`;
  for(const id of ['iDot','iName','iSpeed','iSize','iSense','iTemp','iBiome','iCost','iFood','iBar','iEnergy','iState','bFollow'])IV[id]=$(id);
}
const setT=(el,t)=>{if(el.textContent!==t)el.textContent=t;};
function showInfo(){
  const el=$('info');
  if(!selected||World.creatures.indexOf(selected)<0){selected=null;follow=false;el.classList.remove('show');selR(false);return;}
  if(!IV.bFollow)buildInfo();
  const c=selected,dead=c.state==='dead';
  const state=dead?'Morreu por '+({fome:'fome',catástrofe:'uma catástrofe',predado:'um predador'}[c.cause]||'falta de energia'):MODE[c.state==='home'?'':c.mode]||'Procurando';
  IV.iDot.style.background=SPC[c.sp].hex;setT(IV.iName,`${SPC[c.sp].sing} nº ${c.id}`);
  setT(IV.iSpeed,c.speed.toFixed(2));setT(IV.iSize,c.size.toFixed(2));setT(IV.iSense,(4*c.sense).toFixed(1));setT(IV.iTemp,c.temp.toFixed(2));
  setT(IV.iBiome,biomeName(c.gy||0));setT(IV.iCost,c.cost.toFixed(2));setT(IV.iFood,`${c.food} de 2`);
  IV.iBar.style.width=clamp(c.energy/c.cap,0,1)*100+'%';setT(IV.iEnergy,`${Math.max(0,c.energy).toFixed(0)} de ${c.cap.toFixed(0)}`);
  setT(IV.iState,state);setT(IV.bFollow,follow?'Parar de seguir':'Seguir esta criatura');
  el.classList.add('show');
}
$('info').addEventListener('click',e=>{if(e.target.id==='bFollow'){follow=!follow;if(follow){camDist=Math.min(camDist,45);zoomed=true;}showInfo();}});
function drawHist(){
  const cv=$('chHist'),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio||1,2);if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  const key=$('hSel').value,lim=LIM[key],NB=16,bins=[new Array(NB).fill(0),new Array(NB).fill(0)];
  for(const c of World.creatures){if(c.state==='dead')continue;bins[c.sp][clamp(Math.floor((c[key]-lim[0])/(lim[1]-lim[0])*NB),0,NB-1)]++;}
  const mx=Math.max(1,...bins[0].map((v,i)=>v+bins[1][i])),bw=(w-8)/NB,col=['#38bdf8','#fb7185'];
  for(let i=0;i<NB;i++){let y=h-14;for(let sp=0;sp<2;sp++){const bh=bins[sp][i]/mx*(h-22);g.fillStyle=col[sp];g.fillRect(4+i*bw+1,y-bh,bw-2,bh);y-=bh;}}
  g.fillStyle=isDark()?'rgba(232,238,252,.7)':'rgba(28,42,74,.55)';g.font='700 10px Nunito, system-ui, sans-serif';g.textAlign='left';g.fillText(lim[0],4,h-2);g.textAlign='right';g.fillText(lim[1],w-4,h-2);
}
function updateHall(){
  let b=null,gm=0;
  for(const c of World.creatures){if(c.state==='dead')continue;if(!b||c.kids>b.kids)b=c;if(c.gen>gm)gm=c.gen;}
  $('hall').innerHTML=b?`<span>Hall da fama: ${SPC[b.sp].sing} nº ${b.id}, ${b.kids} filhos</span><span>Geração mais nova: ${gm}</span>`:'';
}
function download(name,text,type){
  const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:type+';charset=utf-8'}));
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
// Cenário reproduzível: configuração inicial, seed, terreno do início e ações do usuário (eventLog).
let terrAtReset={kind:'suave',hg:HG.slice()},terrEdited=false;
const hgText=hg=>Array.from(hg,v=>+v.toPrecision(9)).join(','); // 9 dígitos: volta exatamente ao mesmo Float32
function scenJson(){
  const W=World,c=W.cfg0,t=terrAtReset;
  const o={version:SIM_VERSION,seed:W.seed,food:c.food,pop:c.pop,mutOn:c.mutOn,mut:c.mut,rand:c.rand,pred:c.pred,water:c.water,
    terr:t.kind,terrain32:t.kind==='custom'?hgText(t.hg):undefined,traits:c.traits,timeline:c.timeline,eventLog:W.eventLog};
  if(terrEdited)o.aviso='O terreno foi editado durante a execução. A repetição usa o terreno do início, então o resultado pode mudar.';
  return JSON.stringify(o,null,1);
}
function applyScenario(j){
  const n=v=>+v,pb=n(j.pop[1])||0;
  setInputs({food:n(j.food),popA:n(j.pop[0]),popB:pb||DEF.popB,mutOn:!!j.mutOn,mut:Math.round(n(j.mut)*100),bOn:pb>0,rand:!!j.rand,pred:!!j.pred,water:!!j.water,tr:[0,1].map(i=>Object.assign({},DEF.tr[i],j.traits&&j.traits[i]))});
  $('seed').value=Number.isInteger(j.seed)&&j.seed>=0?String(j.seed):'';
  curTL=Array.isArray(j.timeline)?j.timeline:[];
  const v=j.terr==='custom'?(typeof j.terrain32==='string'?j.terrain32.split(',').map(Number):typeof j.terrain==='string'?j.terrain.split(',').map(x=>x/10):null):null;
  if(v&&v.length===HG.length&&v.every(isFinite)){undoS.push(HG.slice());HG.set(v);$('terr').value='custom';applyTerrain();}
  else if(['suave','plano','montanha','vales'].includes(j.terr)){$('terr').value=j.terr;setTerr(j.terr);}
  doReset({replay:Array.isArray(j.eventLog)?j.eventLog:[]});
}
$('bIO').addEventListener('click',()=>{$('ioT').value=scenJson();$('io').classList.add('show');});
$('ioCsv').addEventListener('click',()=>{$('ioT').value=csvDaily();});
$('dlDia').addEventListener('click',()=>download('diario.csv',csvDaily(),'text/csv'));
$('dlInd').addEventListener('click',()=>download('individuos.csv',csvIndividuals(),'text/csv'));
$('dlCen').addEventListener('click',()=>download('cenario.json',scenJson(),'application/json'));
$('ioJson').addEventListener('click',()=>{$('ioT').value=scenJson();});
$('ioClose').addEventListener('click',()=>$('io').classList.remove('show'));
$('ioCopy').addEventListener('click',()=>{const t=$('ioT');t.select();try{navigator.clipboard.writeText(t.value);toast('Copiado');}catch(e){toast('Selecione e copie manualmente');}});
$('ioApply').addEventListener('click',()=>{
  let j;try{j=JSON.parse($('ioT').value);if(!j||!Array.isArray(j.pop))throw 0;}catch(e){toast('JSON inválido');return;}
  applyScenario(j);$('io').classList.remove('show');toast('Cenário aplicado');
});
$('bRepeat').addEventListener('click',()=>{applyScenario(JSON.parse(scenJson()));toast('Repetindo com a seed '+World.seed);});
function setTerr(k){undoS.push(HG.slice());genTerrain(k);applyTerrain();terrEdited=true;}
$('terr').addEventListener('change',e=>setTerr(e.target.value));
$('bEdit').addEventListener('click',()=>{editT=!editT;$('bEdit').textContent=editT?'Parar de editar':'Editar terreno';canvas.style.cursor=editT?'crosshair':'';if(editT){auto=false;$('autoRot').checked=false;toast('Arraste sobre a ilha para modelar o terreno');}});
$('bEditMode').addEventListener('click',()=>{modeDown=!modeDown;$('bEditMode').textContent=modeDown?'Baixar':'Subir';});
$('bUndo').addEventListener('click',()=>{const u=undoS.pop();if(u){HG.set(u);$('terr').value='custom';applyTerrain();terrEdited=true;}else toast('Nada para desfazer');});
function toggleUI(){const h=document.body.classList.toggle('hideUI');$('bHide').textContent=h?'Mostrar interface (H)':'Ocultar interface (H)';}
$('bHide').addEventListener('click',toggleUI);
function selR(on){selRing.visible=senseDisc.visible=on;}

// ===== Gráficos =====
function drawChart(cv,series,opts){
  const dpr=Math.min(devicePixelRatio||1,2),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const GRID=isDark()?'rgba(255,255,255,.14)':'rgba(28,42,74,.10)',LAB=isDark()?'rgba(232,238,252,.7)':'rgba(28,42,74,.55)';g.clearRect(0,0,w,h);
  const n=Math.max(0,...series.map(s=>s.data.length));
  if(n<2){g.fillStyle=LAB;g.font='700 11.5px Nunito, system-ui, sans-serif';g.textAlign='center';g.fillText('Os gráficos aparecem a partir do dia 2',w/2,h/2+4);return;}
  let lo=Infinity,hi=-Infinity;
  for(const s of series)for(const v of s.data)if(v!=null){lo=Math.min(lo,v);hi=Math.max(hi,v);}
  if(!isFinite(lo))return;
  if(opts.fixed){lo=opts.fixed[0];hi=opts.fixed[1];}
  else{if(opts.zero)lo=0;if(hi-lo<1e-6)hi=lo+1;const pad=(hi-lo)*0.12;if(!opts.zero)lo-=pad;hi+=pad;}
  const L=28,Rr=8,Tp=6,B=14,X=i=>L+(n<=1?0:i/(n-1))*(w-L-Rr),Y=v=>Tp+(1-(v-lo)/(hi-lo))*(h-Tp-B);
  g.font='700 10px Nunito, system-ui, sans-serif';g.lineWidth=1;
  for(let i=0;i<=2;i++){
    const v=lo+(hi-lo)*i/2,y=Y(v);
    g.strokeStyle=GRID;g.beginPath();g.moveTo(L,y);g.lineTo(w-Rr,y);g.stroke();
    g.fillStyle=LAB;g.textAlign='left';g.fillText(opts.int?Math.round(v):v.toFixed(hi-lo<1?2:1),0,y+3);
  }
  for(const s of series){
    g.strokeStyle=s.color;g.lineWidth=2;g.lineJoin='round';g.setLineDash(s.dash||[]);g.beginPath();let on=false,last=null;
    s.data.forEach((v,i)=>{if(v==null){on=false;return;}const x=X(i),y=Y(v);if(!on){g.moveTo(x,y);on=true;}else g.lineTo(x,y);last=[x,y];});
    g.stroke();g.setLineDash([]);if(last){g.fillStyle=s.color;g.beginPath();g.arc(last[0],last[1],3,0,6.283);g.fill();}
  }
  g.fillStyle=LAB;g.textAlign='left';g.fillText('dia 1',L,h-2);g.textAlign='right';g.fillText('dia '+World.history[World.history.length-1].day,w-Rr,h-2);
}
let chartV=-1;
function drawCharts(force){
  const H=World.history;if(!H.length)return;
  const key=H.length+':'+$('trSel').value;if(!force&&key===chartV)return;chartV=key;
  drawChart($('chPop'),[{color:'#38bdf8',data:H.map(h=>h.pop[0])},{color:'#fb7185',dash:[6,4],data:$('bOn').checked?H.map(h=>h.pop[1]):[]}],{zero:true,int:true});
  const idx=+$('trSel').value;
  drawChart($('chTr'),['speed','size','sense'].map((g,i)=>({color:['#f59e0b','#8b5cf6','#10b981'][i],data:H.map(h=>h.avg[idx]?h.avg[idx][g]:null)})),{zero:false});
  drawChart($('chClim'),[{color:isDark()?'#cbd5e1':'#334155',dash:[5,4],data:H.map(h=>h.env)},{color:'#ef4444',data:H.map(h=>h.avg[idx]?h.avg[idx].temp:null)}],{fixed:[-1,1]});
}
$('trSel').addEventListener('change',()=>drawCharts(true));
$('hSel').addEventListener('change',()=>drawHist());
$('fSet').addEventListener('click',()=>{const o=!$('ctrl').classList.contains('open');closeSheets();if(o){$('ctrl').classList.add('open');$('fSet').classList.add('on');}});
$('fCharts').addEventListener('click',()=>{const o=!$('charts').classList.contains('open');closeSheets();if(o){$('charts').classList.add('open');$('fCharts').classList.add('on');drawCharts(true);drawHist();updateHall();}});

// ===== Controles =====
let paused=false,simSpeed=3,resetTimer=0,cfgRevSeen=0;
// Anúncios para leitores de tela: só eventos, avisos e o resumo pedido pelo usuário (o HUD não é anunciado).
function announce(msg){const r=$('sr');r.textContent='';setTimeout(()=>{r.textContent=msg;},60);}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3800);announce(msg);}
function summary(){
  const W=World,n=[0,0];for(const c of W.creatures)if(c.state!=='dead')n[c.sp]++;
  let f=0;for(const x of W.foods)if(x.alive)f++;
  return `Dia ${W.day}, ${(PH[W.phase]||'').toLowerCase()}. Azuis: ${n[0]}.${World.cfg.pop[1]>0?` Rosas: ${n[1]}.`:''} Frutas restantes: ${f}. Clima ${climaName(W.temp).toLowerCase()}.`;
}
// opts.replay: ações gravadas de uma execução anterior (o evento do preset já está nelas).
function doReset(opts){
  const replay=opts&&opts.replay;
  clearTimeout(resetTimer);resetWorld(readCfg(),replay?{replay}:undefined);
  terrAtReset={kind:$('terr').value,hg:HG.slice()};terrEdited=false;cfgRevSeen=0;
  const pv=PRESETS[$('preset').value];if(!replay&&pv&&pv.ev)userAction({ev:pv.ev});
  $('seedNow').textContent='desta execução: '+World.seed;
  selected=null;showInfo();
  $('over').classList.remove('show');chartV=-1;drawCharts(true);
}
function setSpeed(s){simSpeed=s;document.querySelectorAll('#spd button').forEach(b=>b.classList.toggle('on',+b.dataset.s===s));}
function setPaused(p){paused=p;$('bPlay').textContent=p?'Continuar':'Pausar';}
for(const el of inputs){
  el.addEventListener('input',()=>{
    labels();
    if(el.classList.contains('live')){const c=readCfg(),set={};for(const k of LIVE_KEYS)if(World.cfg[k]!==c[k])set[k]=c[k];if(Object.keys(set).length)userAction({set});}
    else if(el.classList.contains('setup')){clearTimeout(resetTimer);resetTimer=setTimeout(doReset,350);}
  });
}
$('preset').addEventListener('change',e=>{const p=PRESETS[e.target.value]||{};curTL=p.timeline||[];setInputs(Object.assign({},DEF,p));doReset();if(p.note)toast(p.note);});
$('bPlay').addEventListener('click',()=>setPaused(!paused));
$('bReset').addEventListener('click',doReset);
$('bSum').addEventListener('click',()=>announce(summary()));$('overB').addEventListener('click',doReset);
document.querySelectorAll('#spd button').forEach(b=>b.addEventListener('click',()=>setSpeed(+b.dataset.s)));
document.querySelectorAll('[data-ev]').forEach(b=>b.addEventListener('click',()=>userAction({ev:b.dataset.ev})));
addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(modoLivre&&e.code!=='KeyM')return; // na câmera livre as teclas movem a câmera
  if(e.code==='Space'){e.preventDefault();setPaused(!paused);}
  if(e.code==='KeyH')toggleUI();
  if(e.code==='KeyR')announce(summary());
  if(e.code==='KeyM')alternarSom();
  const i=['Digit1','Digit2','Digit3','Digit4'].indexOf(e.code);if(i>=0)setSpeed([1,3,10,30][i]);
});

// ===== HUD =====
const PH={dawn:'Amanhecendo',forage:'Procurando comida',dusk:'Fim do dia',over:'Extinção',idle:''};
const climaName=t=>t<-0.35?'Frio':t>0.35?'Quente':'Ameno';
let labelDay=-1;
function syncLive(){
  const c=World.cfg;$('food').value=c.food;$('mutOn').checked=c.mutOn;$('mut').value=Math.round(c.mut*100);$('rand').checked=c.rand;$('pred').checked=c.pred;$('water').checked=c.water;labels();
}
function updateHUD(){
  const W=World,n=[0,0];
  if(W.cfgRev!==cfgRevSeen){cfgRevSeen=W.cfgRev;syncLive();}for(const c of W.creatures)if(c.state!=='dead')n[c.sp]++;
  $('hDay').textContent=W.day;$('nA').textContent=n[0];$('nB').textContent=n[1];
  let f=0;for(const x of W.foods)if(x.alive)f++;$('nF').textContent=f;$('nT').textContent=climaName(W.temp);
  if(W.day!==labelDay){if(W.day>labelDay&&labelDay>0)Som.dia();labelDay=W.day;canvas.setAttribute('aria-label',`Ilha 3D, dia ${W.day}: ${n[0]} azuis${World.cfg.pop[1]>0?` e ${n[1]} rosas`:''}. Use o botão Resumo para ouvir os números.`);}
  $('hPhase').textContent=W.phase==='dusk'?`Nasceram ${W.lastStats.born}, morreram ${W.lastStats.died}`:PH[W.phase];
  while(W.events.length){const e=W.events.shift();if(e.type==='extinct'){Som.extintos();}if(e.type==='extinct')toast(`${SPC[e.sp].name} ${e.sp?'extintas':'extintos'} no dia ${e.day}`);else if(e.type==='event'){Som.evento(e.key);toast(`${e.name}: ${e.txt}`);if(e.key==='extincao')metT=0;}else if(e.type==='warn')toast(e.txt);}
  if(W.phase==='over'&&!$('over').classList.contains('show')){
    $('overT').textContent='Extinção total';
    $('overP').textContent=`Nenhuma criatura voltou a tempo no dia ${W.day}. Tente mais comida, outros traços ou deixe a mutação ligada.`;
    $('over').classList.add('show');drawCharts(true);announce(`${$('overT').textContent}. ${$('overP').textContent}`);
  }
  drawCharts(false);if(frameN%32===0){drawHist();updateHall();}
}

// ===== Som =====
function somIcone(){const b=$('bSom');b.classList.toggle('off',!Som.ligado);b.setAttribute('aria-pressed',String(Som.ligado));b.title=Som.ligado?'Som ligado (M)':'Som desligado (M)';}
function alternarSom(){Som.alternar();somIcone();}
$('bSom').addEventListener('click',e=>{e.stopPropagation();alternarSom();});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.btn,select,input[type=checkbox]'))Som.clique();});
somIcone();
