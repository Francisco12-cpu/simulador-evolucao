// Motor da simulação: regras, sem DOM e sem Three.js. Os testes (tests/sim-harness.mjs) leem este arquivo.
// Parte do simulador Evolução. Scripts clássicos (sem build): a ordem de carregamento está no index.html
// e as declarações de nível superior são compartilhadas entre os arquivos.
'use strict';

// ==SIM-START==
// ===== Motor da simulação (sem nada de 3D aqui) =====
const SIM_VERSION='2.1.0'; // muda a cada alteração de comportamento do motor (ver docs/CHANGELOG_CIENTIFICO.md)
const R=30, BASE_V=5, MAXPOP=300, SUB=0.05;
const LIM={speed:[0.4,3.5],size:[0.5,2.6],sense:[0.3,4],temp:[-1,1]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Dois geradores derivados da mesma seed: `rng` para o mundo (posições, frutas, mutações, movimento) e
// `rngEv` para os eventos (sorteio dos eventos aleatórios e vítimas da extinção). Assim, ligar os eventos
// aleatórios não muda as frutas nem as mutações enquanto nenhum evento acontece.
let rng,rngEv,pendingSeed=null;
const randomSeed=()=>((Date.now()&0x7fffffff)^Math.floor(Math.random()*0x7fffffff))>>>0;
function seedAll(s){s=s>>>0;World.seed=s;rng=mulberry32(s);rngEv=mulberry32((s^0x9E3779B9)>>>0);}
function useSeed(s){pendingSeed=s>>>0;} // a próxima resetWorld sem cfg.seed usa esta seed
const gauss=()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const World={day:0,phase:'idle',phaseT:0,creatures:[],order:[],foods:[],cfg:null,cfg0:null,seed:0,eventLog:[],replay:[],cfgRev:0,nextId:1,history:[],tally:null,registry:[],registryFull:false,stats:null,events:[],alive:[true,true],lastStats:{born:0,died:0},temp:0,tempTarget:0,drought:0,rain:0,rad:0,fx:[]};

// Energia máxima cresce com o tamanho; o gasto por segundo cresce com tamanho³ × velocidade² + visão.
const capOf=c=>36*(0.6+0.4*c.size);
const TEMPK=1.2; // quanto custa estar longe do clima ideal
const costOf=c=>{const d=(c.temp||0)-World.temp;return 2.5*(0.5*Math.pow(c.size,3)*c.speed*c.speed+0.45*c.sense+0.15)*(1+TEMPK*d*d);};
// Predação (com cfg.pred): as rosas viram carnívoras (não comem fruta) e caçam azuis pelo menos PREYK vezes menores,
// fora do refúgio de largura REF perto da areia. Enxergam presas a HK·visão. A presa percebe o predador a
// FLEEK·visão dela e foge. Uma presa vale PREY_FOOD frutas (um animal rende mais que uma fruta).
const PREYK=1.3,FLEEK=2,REF=2,HK=4,PREY_FOOD=2;
const carnivore=c=>c.sp===1&&World.cfg.pred;
const LAKES=[{x:-5,z:4,r:8},{x:11,z:-9,r:5.5}],LAKE=LAKES[0];
const lakeK=()=>World.drought>0?0.55:World.rain>0?1.25:1;
const lakeR=l=>(l||LAKE).r*lakeK();
const SLOPEK=1.2; // subir ladeira custa energia extra
const TURN=7; // giro máximo (rad/s)
const GN=48,GS=2*(R+1)/GN,HG=new Float32Array((GN+1)*(GN+1));
// Nível do mar (o plano do oceano na cena) e piso do relevo dentro da ilha. O piso é suave: abaixo de
// FLOOR+FLOOR_K a altura se aproxima de FLOOR exponencialmente, sem degrau nem platô.
const SEA_Y=-1.5,FLOOR=SEA_Y+0.3,FLOOR_K=0.5;
function genTerrain(kind){
  if(kind==='custom')return;
  for(let iz=0;iz<=GN;iz++)for(let ix=0;ix<=GN;ix++){
    const x=-R-1+ix*GS,z=-R-1+iz*GS;let h=0;
    if(kind==='suave')h=0.9*Math.sin(x*0.19+1)*Math.cos(z*0.17)+0.7*Math.sin((x+z)*0.11+2)+0.4*Math.sin(z*0.31-x*0.07);
    else if(kind==='montanha')h=3.2*Math.exp(-(x*x+z*z)/70);
    else if(kind==='vales')h=1.3*Math.sin(x*0.24)*Math.sin(z*0.24);
    HG[iz*(GN+1)+ix]=h;
  }
}
function H(x,z){
  const r=Math.hypot(x,z);if(r>=R-1.5)return 0;
  const fx=(x+R+1)/GS,fz=(z+R+1)/GS,ix=Math.floor(fx),iz=Math.floor(fz);if(ix<0||iz<0||ix>=GN||iz>=GN)return 0;
  const tx=fx-ix,tz=fz-iz,i=iz*(GN+1)+ix;
  let h=HG[i]*(1-tx)*(1-tz)+HG[i+1]*tx*(1-tz)+HG[i+GN+1]*(1-tx)*tz+HG[i+GN+2]*tx*tz;
  let f=clamp((R-2.5-r)/3.5,0,1);f=f*f*(3-2*f);h*=f;
  if(h<FLOOR+FLOOR_K)h=FLOOR+FLOOR_K*Math.exp((h-FLOOR-FLOOR_K)/FLOOR_K);
  if(World.cfg&&World.cfg.water){for(const L of LAKES){const d=Math.hypot(x-L.x,z-L.z),k=clamp((d-L.r)/3,0,1),q=k*k*(3-2*k);h=h*q-0.5*(1-q);}}
  return h;
}
genTerrain('suave');
const biomeName=h=>h>2.3?'Pico nevado':h>1.2?'Morro rochoso':h<-0.2?'Vale úmido':'Planície';
// Disputa por fruta: só entre as criaturas que tocam a fruta no mesmo passo (alcance 0,7·tamanho + 0,55).
// Vence uma delas com probabilidade ∝ tamanho^CONTEST_K (k → ∞: o maior sempre vence; k = 0: sorteio igual).
// CONTEST_COST (opcional, desligado) é a energia que cada participante gasta na disputa.
const CONTEST_K=4,CONTEST_COST=0;
const reachOf=c=>0.7*c.size+0.55;

function mk(sp,g,home,parent){
  const c={id:World.nextId++,parentId:parent?parent.id:null,birthDay:World.day,deathDay:null,sp,speed:g.speed,size:g.size,sense:g.sense,temp:g.temp||0,home,x:R*Math.cos(home),z:R*Math.sin(home),
    heading:home+Math.PI,food:0,state:'home',mode:'',target:null,wanderT:0,wanderDir:home+Math.PI,vis:0,cause:'',gen:0,kids:0,h0:0};
  c.cap=capOf(c);c.cost=costOf(c);c.energy=c.cap;return c;
}
const TRAITS=['speed','size','sense','temp'];
const CAUSES=['energia','fome','predado','catástrofe'];
function avgOf(list){
  if(!list.length)return null;
  const a={speed:0,size:0,sense:0,temp:0};
  for(const c of list){a.speed+=c.speed;a.size+=c.size;a.sense+=c.sense;a.temp+=c.temp;}
  const n=list.length;a.speed/=n;a.size/=n;a.sense/=n;a.temp/=n;return a;
}
// Desvio-padrão populacional (divisor n): a lista é a população inteira, não uma amostra.
function sdOf(list,a){
  if(!list.length)return null;
  const d={speed:0,size:0,sense:0,temp:0};
  for(const c of list)for(const k of TRAITS)d[k]+=(c[k]-a[k])*(c[k]-a[k]);
  for(const k of TRAITS)d[k]=Math.sqrt(d[k]/list.length);return d;
}
const newTally=()=>({born:[0,0],died:[0,1].map(()=>Object.fromEntries(CAUSES.map(k=>[k,0])))});
// Cada entrada do histórico (dia d) guarda a população no início do dia e, em born/died, o que aconteceu
// até o início do dia d+1. Assim pop[d+1] = pop[d] + born[d] − Σ died[d], por espécie.
function record(){
  const W=World,l0=W.creatures.filter(c=>c.sp===0),l1=W.creatures.filter(c=>c.sp===1),ls=[l0,l1,W.creatures];
  const avg=ls.map(avgOf);W.tally=newTally();
  W.history.push({day:W.day,pop:[l0.length,l1.length],avg,sd:ls.map((l,i)=>sdOf(l,avg[i])),env:W.temp,born:W.tally.born,died:W.tally.died});
}
const REG_MAX=50000; // limite do registro de mortos (individuos.csv)
function kill(c,cause){
  const W=World;if(c.state==='dead')return; // nunca contar a mesma morte duas vezes
  c.state='dead';c.cause=cause;c.deathDay=W.day;W.tally.died[c.sp][cause]++;
  if(W.registry.length<REG_MAX)W.registry.push(c);
  else if(!W.registryFull){W.registryFull=true;W.events.push({type:'warn',txt:`O registro de indivíduos chegou a ${REG_MAX} mortos; os próximos não entram em individuos.csv`});}
}
function resetWorld(cfg,opts){
  const W=World;
  seedAll(Number.isInteger(cfg.seed)?cfg.seed:pendingSeed!=null?pendingSeed:randomSeed());pendingSeed=null;
  W.cfg=cfg;W.cfg0=JSON.parse(JSON.stringify(cfg));W.eventLog=[];W.cfgRev=0;W.tally=newTally();W.registry=[];W.registryFull=false;W.nextId=1;W.stats={frutasComidas:0,frutasTransferidas:0,disputas:0};
  W.replay=((opts&&opts.replay)||[]).filter(validAction).map(e=>Object.assign({},e)).sort((a,b)=>actKey(a)-actKey(b)||a.phaseT-b.phaseT);
  W.day=0;W.phase='idle';W.phaseT=0;W.creatures=[];W.foods=[];W.history=[];W.events=[];W.lastStats={born:0,died:0};
  W.alive=[cfg.pop[0]>0,cfg.pop[1]>0];
  W.temp=0;W.tempTarget=0;W.drought=0;W.rain=0;W.rad=0;
  for(let sp=0;sp<2;sp++)for(let i=0;i<cfg.pop[sp];i++)W.creatures.push(mk(sp,cfg.traits[sp],rng()*Math.PI*2));
  startDay();
}
const EVENTS={
  seca:{name:'Seca',txt:'poucas frutas nos próximos 3 dias'},
  chuva:{name:'Chuva forte',txt:'muitas frutas nos próximos 3 dias'},
  frio:{name:'Era do gelo',txt:'o clima vai esfriando'},
  calor:{name:'Aquecimento',txt:'o clima vai esquentando'},
  ameno:{name:'Clima ameno',txt:'a temperatura volta ao normal'},
  radiacao:{name:'Radiação',txt:'mutações mais fortes por 3 dias'},
  extincao:{name:'Extinção em massa',txt:'boa parte da população morreu'}
};
function triggerEvent(key){
  const W=World,e=EVENTS[key];if(!e)return;
  if(key==='seca'){W.drought=3;W.rain=0;}
  else if(key==='chuva'){W.rain=3;W.drought=0;}
  else if(key==='frio')W.tempTarget=-0.8;
  else if(key==='calor')W.tempTarget=0.8;
  else if(key==='ameno')W.tempTarget=0;
  else if(key==='radiacao')W.rad=3;
  else if(key==='extincao'){
    const live=W.creatures.filter(c=>c.state!=='dead');let left=live.length;
    for(const c of live){if(left>1&&rngEv()<0.6){kill(c,'catástrofe');left--;}}
  }
  W.events.push({type:'event',key,name:e.name,txt:e.txt});
}
// Ações do usuário durante a execução (evento manual ou mudança de um controle "ao vivo").
// Ficam em World.eventLog com o ponto exato em que aconteceram ({day, phase, phaseT}); um replay
// as reaplica no início do mesmo passo, o que reproduz a execução inteira.
const LIVE_KEYS=['food','mutOn','mut','rand','pred','water'];
const PH_I={idle:-1,dawn:0,forage:1,dusk:2,over:3};
const actKey=e=>e.day*4+PH_I[e.phase];
function validAction(e){
  if(!e||!Number.isInteger(e.day)||!(e.phase in PH_I)||typeof e.phaseT!=='number'||!isFinite(e.phaseT))return false;
  if(e.ev!==undefined)return e.ev in EVENTS;
  return !!e.set&&typeof e.set==='object'&&Object.keys(e.set).length>0&&Object.keys(e.set).every(k=>LIVE_KEYS.includes(k));
}
function applyAction(e){
  const W=World;W.eventLog.push(e);
  if(e.ev!==undefined)triggerEvent(e.ev);
  else{for(const k of LIVE_KEYS)if(k in e.set)W.cfg[k]=e.set[k];W.cfgRev++;}
}
function userAction(a){
  const W=World,e=Object.assign({day:W.day,phase:W.phase,phaseT:W.phaseT},a);
  if(validAction(e))applyAction(e);
}
function runReplay(){
  const W=World,q=W.replay,now=actKey(W);
  while(q.length&&(actKey(q[0])<now||(actKey(q[0])===now&&W.phaseT>=q[0].phaseT-1e-9)))applyAction(q.shift());
}
function scenario(){const W=World;return{version:SIM_VERSION,seed:W.seed,cfg:W.cfg0,eventLog:W.eventLog.slice()};}
function foodToday(){
  const W=World;let m=1-0.2*Math.abs(W.temp);
  if(W.drought>0){m*=0.4;W.drought--;}
  if(W.rain>0){m*=1.8;W.rain--;}
  return clamp(Math.round(W.cfg.food*m),3,190);
}
function spawnFood(n){
  const W=World;W.foods=[];
  for(let i=0;i<n;i++){
    let x,z,t=0;
    do{const r=Math.sqrt(rng())*(R-3.5),a=rng()*Math.PI*2;x=r*Math.cos(a);z=r*Math.sin(a);}while(((W.cfg.water&&LAKES.some(L=>Math.hypot(x-L.x,z-L.z)<L.r*1.1+1))||rng()>clamp(1.1-0.3*H(x,z),0.25,1))&&++t<30);
    const hh=H(x,z);
    W.foods.push({x,z,k:hh>1.2?2:hh<-0.2?0:1,alive:true,vis:0,ph:rng()*6.28});
  }
}
function startDay(){
  const W=World;
  for(const t of (W.cfg.timeline||[]))if(t[0]===W.day+1)triggerEvent(t[1]);
  if(W.cfg.rand&&W.day>2&&rngEv()<0.06){const ks=Object.keys(EVENTS);triggerEvent(ks[Math.floor(rngEv()*ks.length)]);}
  W.creatures=W.creatures.filter(c=>c.state!=='dead');
  const n=[0,0];for(const c of W.creatures)n[c.sp]++;
  for(let sp=0;sp<2;sp++)if(n[sp]===0&&W.alive[sp]){W.alive[sp]=false;W.events.push({type:'extinct',sp,day:W.day});}
  if(W.creatures.length===0){W.phase='over';return;}
  W.day++;
  W.temp+=clamp(W.tempTarget-W.temp,-0.1,0.1);
  for(const c of W.creatures){
    c.state='out';c.drank=false;c.food=0;c.cap=capOf(c);c.cost=costOf(c);c.energy=c.cap;c.target=null;c.mode='';
    c.x=R*Math.cos(c.home);c.z=R*Math.sin(c.home);c.h0=0;c.heading=c.home+Math.PI;c.wanderDir=c.heading;c.wanderT=0;
  }
  W.order=W.creatures.slice().sort((a,b)=>b.size-a.size); // ordem de processamento dentro de cada passo
  spawnFood(foodToday());
  record();
  W.phase='dawn';W.phaseT=0;
}
function endDay(){
  const W=World;
  for(const c of W.creatures){
    if(c.state==='out')kill(c,'energia');
    else if(c.state==='home'&&c.food<1){kill(c,'fome');W.fx.push([c.x,c.z,2]);}
  }
  const surv=W.creatures.filter(c=>c.state==='home');
  const died=W.creatures.length-surv.length;
  const base=W.cfg.mutOn?W.cfg.mut:0,mut=W.rad>0?Math.max(base*3,0.2):base,kids=[];
  for(const p of surv){
    if(p.food>=2&&(!W.cfg.water||p.drank||rng()<0.6)&&surv.length+kids.length<MAXPOP){
      const g={};
      for(const key of ['speed','size','sense'])g[key]=clamp(p[key]*(1+(mut?gauss()*mut:0)),LIM[key][0],LIM[key][1]);
      g.temp=clamp(p.temp+(mut?gauss()*mut*0.6:0),LIM.temp[0],LIM.temp[1]);
      {const k2=mk(p.sp,g,p.home+gauss()*0.12,p);k2.gen=p.gen+1;p.kids++;kids.push(k2);W.tally.born[p.sp]++;}
    }
  }
  for(const k of kids){W.creatures.push(k);W.fx.push([k.x,k.z,1]);}
  W.lastStats={born:kids.length,died};
  if(W.rad>0)W.rad--;
  W.phase='dusk';W.phaseT=0;
}
// Energia estimada para voltar à areia pelo caminho radial. Soma o tempo de virar: com o giro limitado,
// a criatura anda na direção errada enquanto vira, e depois precisa desfazer esse trecho (por isso 2×).
// Soma também as subidas do caminho (amostradas em 4 pontos), que custam cost·SLOPEK·Δh/v.
function returnEnergy(c,r,v){
  const d=Math.max(0,R-r);
  let ang=Math.atan2(c.z,c.x)-c.heading;ang=Math.abs(Math.atan2(Math.sin(ang),Math.cos(ang)));
  let e=(d/v+2*ang/TURN)*c.cost;
  if(d>0.5){
    const ux=r>1e-6?c.x/r:Math.cos(c.home),uz=r>1e-6?c.z/r:Math.sin(c.home);let h0=H(c.x,c.z),up=0;
    for(let i=1;i<=4;i++){const rr=r+d*i/4,h1=H(ux*rr,uz*rr);if(h1>h0)up+=h1-h0;h0=h1;}
    e+=up*c.cost*SLOPEK/v;
  }
  return e;
}
function step(dt){
  const W=World;if(W.replay.length)runReplay();W.phaseT+=dt;
  if(W.phase==='dawn'){if(W.phaseT>=1){W.phase='forage';W.phaseT=0;}return;}
  if(W.phase==='dusk'){if(W.phaseT>=1.4)startDay();return;}
  if(W.phase!=='forage')return;
  const foods=W.foods;let aliveFood=0;
  for(const f of foods)if(f.alive)aliveFood++;
  let remaining=0;
  for(const c of W.order){
    if(c.state!=='out')continue;
    c.energy-=c.cost*dt;
    if(c.energy<=0){kill(c,'energia');continue;}
    const v=BASE_V*c.speed;let r=Math.hypot(c.x,c.z);
    const ret=c.food>=2||(aliveFood===0&&!carnivore(c))||c.energy<returnEnergy(c,r,v)*1.25+1.5;
    let dx,dz;
    if(ret){
      c.mode='ret';c.target=null;
      let tl=null;
      if(W.cfg.water&&!c.drank&&c.food>=1){
        let L=LAKES[0],ld=1e9;
        for(const l of LAKES){const d=Math.hypot(l.x-c.x,l.z-c.z);if(d<ld){ld=d;L=l;}}
        if(ld<lakeR(L)+0.6)c.drank=true;
        else if(c.energy>(ld+R-Math.hypot(L.x,L.z))/v*c.cost*1.25+1.5)tl=L;
      }
      if(tl){c.mode='drink';dx=tl.x-c.x;dz=tl.z-c.z;}
      else if(r<1e-6){dx=Math.cos(c.home);dz=Math.sin(c.home);}else{dx=c.x/r;dz=c.z/r;}
    }else{
      if(c.target&&!c.target.alive)c.target=null;
      if(!c.target&&!carnivore(c)){
        const sr=4*c.sense;let bd=sr*sr,best=null;
        for(const f of foods){if(!f.alive)continue;const ex=f.x-c.x,ez=f.z-c.z,d=ex*ex+ez*ez;if(d<bd){bd=d;best=f;}}
        c.target=best;
      }
      if(c.prey&&c.prey.state!=='out')c.prey=null;
      if(!c.target&&c.sp===1&&W.cfg.pred&&!c.prey){
        const sr=HK*c.sense;let bd=sr*sr,best=null;
        for(const o of W.creatures){if(o.sp!==0||o.state!=='out'||o.size*PREYK>c.size||Math.hypot(o.x,o.z)>R-REF)continue;const ex=o.x-c.x,ez=o.z-c.z,d=ex*ex+ez*ez;if(d<bd){bd=d;best=o;}}
        c.prey=best;
      }
      if(c.target){c.mode='seek';dx=c.target.x-c.x;dz=c.target.z-c.z;}
      else if(c.prey){c.mode='hunt';dx=c.prey.x-c.x;dz=c.prey.z-c.z;}
      else{
        c.mode='wander';c.wanderT-=dt;
        if(r>R-3){c.wanderDir=Math.atan2(-c.z,-c.x)+gauss()*0.4;c.wanderT=0.8;}
        else if(c.wanderT<=0){c.wanderDir=c.heading+gauss()*0.9;c.wanderT=0.8+rng()*1.6;}
        dx=Math.cos(c.wanderDir);dz=Math.sin(c.wanderDir);
      }
    }
    if(W.cfg.pred&&c.sp===0){
      let fd=(FLEEK*c.sense)**2,pr=null;
      for(const o of W.creatures){if(o.sp!==1||o.state!=='out'||c.size*PREYK>o.size)continue;const ex=o.x-c.x,ez=o.z-c.z,d=ex*ex+ez*ez;if(d<fd){fd=d;pr=o;}}
      if(pr){dx=c.x-pr.x;dz=c.z-pr.z;c.mode='flee';}
    }
    let diff=Math.atan2(dz,dx)-c.heading;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
    const mt=TURN*dt;c.heading+=clamp(diff,-mt,mt);
    c.x+=Math.cos(c.heading)*v*dt;c.z+=Math.sin(c.heading)*v*dt;r=Math.hypot(c.x,c.z);
    {const h1=H(c.x,c.z),sl=(h1-c.h0)/(v*dt);if(sl>0)c.energy-=c.cost*dt*Math.min(sl,1.5)*SLOPEK;
      const d0=c.temp-W.temp,d1=d0+0.15*h1;c.energy-=c.cost/(1+TEMPK*d0*d0)*TEMPK*(d1*d1-d0*d0)*dt;c.h0=h1;}
    if(c.food<2&&!carnivore(c)){
      const er=reachOf(c),e2=er*er;
      for(const f of foods){
        if(!f.alive)continue;
        const ex=f.x-c.x,ez=f.z-c.z;
        if(ex*ex+ez*ez<e2){
          let win=c,rivals=null;
          for(const o of W.order){
            if(o===c||o.state!=='out'||o.food>=2)continue;
            const ox=f.x-o.x,oz=f.z-o.z,rr=reachOf(o);
            if(ox*ox+oz*oz<rr*rr)(rivals||(rivals=[c])).push(o);
          }
          if(rivals){
            W.stats.disputas++;
            let tot=0;for(const o of rivals)tot+=Math.pow(o.size,CONTEST_K);
            let u=rng()*tot;win=rivals[rivals.length-1];
            for(const o of rivals){u-=Math.pow(o.size,CONTEST_K);if(u<0){win=o;break;}}
            if(CONTEST_COST>0)for(const o of rivals)o.energy-=CONTEST_COST;
          }
          W.stats.frutasComidas++;if(win!==c)W.stats.frutasTransferidas++;
          f.alive=false;win.food++;aliveFood--;W.fx.push([f.x,f.z,0]);
          if(f.k===2)win.energy=Math.min(win.cap,win.energy+15);
          if(win.target===f)win.target=null;if(c.target===f)c.target=null;
          break;
        }
      }
    }
    if(W.cfg.water&&!c.drank&&LAKES.some(l=>Math.hypot(l.x-c.x,l.z-c.z)<lakeR(l)+0.6))c.drank=true;
    if(c.prey&&c.prey.state==='out'&&c.food<2){const ex=c.prey.x-c.x,ez=c.prey.z-c.z,pr2=0.7*c.size+0.55;if(ex*ex+ez*ez<pr2*pr2){kill(c.prey,'predado');W.fx.push([c.prey.x,c.prey.z,2]);c.food=Math.min(2,c.food+PREY_FOOD);c.prey=null;}}
    if(r>=R){
      if(ret){const a=Math.atan2(c.z,c.x);c.home=a;c.x=R*Math.cos(a);c.z=R*Math.sin(a);c.state='home';c.mode='';continue;}
      const k=(R-0.3)/r;c.x*=k;c.z*=k;
    }
    remaining++;
  }
  if(remaining===0||W.phaseT>150)endDay();
}
// ===== Exportação (funções puras sobre World, sem DOM) =====
const fx3=v=>v==null||!isFinite(v)?'':(+v).toFixed(3);
function csvHeader(title){
  const W=World,c=W.cfg0||{};
  return [`# Evolução: ${title}`,`# versao_motor=${SIM_VERSION} seed=${W.seed} gerado=${new Date().toISOString()}`,
    `# config: frutas=${c.food} pop_inicial=${(c.pop||[]).join('/')} mutacao=${c.mutOn?c.mut:0} eventos_aleatorios=${!!c.rand} predacao=${!!c.pred} lagos=${!!c.water} acoes_do_usuario=${W.eventLog.length}`];
}
function csvDaily(){
  const sp=['az','ro'],tn={speed:'velocidade',size:'tamanho',sense:'visao',temp:'clima_ideal'},cn={energia:'energia',fome:'fome',predado:'predado','catástrofe':'catastrofe'};
  const cols=['dia','clima_do_dia'];
  for(const p of sp){cols.push(p+'_n');for(const k of TRAITS)cols.push(`${p}_${tn[k]}_media`,`${p}_${tn[k]}_dp`);cols.push(p+'_nascimentos');for(const k of CAUSES)cols.push(`${p}_mortes_${cn[k]}`);}
  const r=csvHeader('diário').concat(['# n = vivos no início do dia; nascimentos e mortes = do início deste dia ao início do seguinte; dp = desvio-padrão com divisor n; a última linha pode estar incompleta',cols.join(',')]);
  for(const h of World.history){
    const row=[h.day,h.env.toFixed(2)];
    for(let i=0;i<2;i++){
      row.push(h.pop[i]);
      for(const k of TRAITS)row.push(fx3(h.avg[i]&&h.avg[i][k]),fx3(h.sd&&h.sd[i]&&h.sd[i][k]));
      row.push(h.born?h.born[i]:'');for(const k of CAUSES)row.push(h.died?h.died[i][k]:'');
    }
    r.push(row.join(','));
  }
  return r.join('\n');
}
function csvIndividuals(){
  const W=World,all=W.registry.concat(W.creatures.filter(c=>c.state!=='dead')).sort((a,b)=>a.id-b.id);
  const r=csvHeader('indivíduos').concat([`# mortos registrados: ${W.registry.length}${W.registryFull?` (limite de ${REG_MAX} atingido; mortes posteriores não estão aqui)`:''}; vivos: ${all.length-W.registry.length}`,
    'id,especie,pai,geracao,dia_nascimento,dia_morte,causa,filhos,velocidade,tamanho,visao,clima_ideal']);
  for(const c of all)r.push([c.id,c.sp?'rosa':'azul',c.parentId??'',c.gen,c.birthDay,c.deathDay??'',c.state==='dead'?c.cause:'',c.kids,fx3(c.speed),fx3(c.size),fx3(c.sense),fx3(c.temp)].join(','));
  return r.join('\n');
}
// ==SIM-END==
