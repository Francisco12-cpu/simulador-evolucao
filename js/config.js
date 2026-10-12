// Utilidades da interface, presets e leitura dos controles.
// Parte do simulador Evolução. Scripts clássicos (sem build): a ordem de carregamento está no index.html
// e as declarações de nível superior são compartilhadas entre os arquivos.
'use strict';

if(typeof THREE==='undefined'){document.getElementById('err').classList.add('show');throw new Error('Three.js não carregou (pasta vendor/)');}
const $=id=>document.getElementById(id);
const mqDark=matchMedia('(prefers-color-scheme: dark)');
const isDark=()=>{const t=document.documentElement.dataset.theme;return t==='dark'||(t!=='light'&&mqDark.matches);};

// ===== Configuração e interface =====
const SPC=[{name:'Azuis',sing:'Azul',hex:'#38bdf8'},{name:'Rosas',sing:'Rosa',hex:'#fb7185'}];
const GENES=[['speed','Velocidade',[0.5,3]],['size','Tamanho',[0.5,2.5]],['sense','Visão',[0.3,3]],['temp','Clima ideal',[-1,1]]];
const DEF={food:45,popA:6,popB:6,mutOn:true,mut:12,bOn:true,rand:false,pred:false,water:false,tr:[{speed:1.2,size:0.8,sense:1,temp:-0.2},{speed:0.8,size:1.3,sense:1,temp:0.2}]};
const PRESETS={padrao:{},escassez:{food:22},fartura:{food:120},clones:{mutOn:false},solo:{bOn:false},gelo:{ev:'frio'},caos:{rand:true},lago:{water:true,food:50,note:'Dois lagos na ilha. Quem bebe antes de voltar tem mais chance de ter filhos. Na seca os lagos encolhem.'},predacao:{pred:true,food:70,popA:20,popB:3,tr:[{speed:1.2,size:0.8,sense:1,temp:-0.2},{speed:0.7,size:1.8,sense:0.8,temp:0.2}],note:'As rosas são predadoras: não comem fruta, só caçam azuis bem menores. Os azuis fogem quando enxergam uma rosa e se escondem perto da areia. Veja as populações subirem e descerem; às vezes os predadores somem da ilha.'},
  secas:{bOn:false,popA:12,food:55,mut:10,timeline:[[8,'seca'],[16,'seca'],[24,'seca']],note:'Três secas seguidas: a quantidade de frutas cai, mas o tipo de fruta não muda. Observe a população cair e se recuperar.'},
  asteroide:{timeline:[[10,'extincao'],[10,'frio'],[10,'seca'],[26,'ameno']],note:'Impacto no dia 10: extinção, frio e seca; o clima se recupera no dia 26. A extinção aqui é aleatória; no evento real ela foi seletiva.'},
  aquec:{timeline:[[3,'calor']],note:'O clima esquenta devagar. Quem tem clima ideal mais quente se dá melhor.'}};
let curTL=[];

['A','B'].forEach((L,sp)=>{
  GENES.forEach(([g,name,[lo,hi]])=>{
    const id=`t${L}_${g}`;
    $('tr'+L).insertAdjacentHTML('beforeend',`<div class="row"><label>${name} <b id="v_${id}"></b></label><input class="setup" type="range" id="${id}" min="${lo}" max="${hi}" step="0.1"></div>`);
  });
});
const inputs=[...document.querySelectorAll('#ctrl input')];
function labels(){
  for(const el of inputs){
    if(el.type!=='range')continue;
    const b=$('v_'+el.id);if(!b)continue;
    b.textContent=el.id==='mut'?el.value+'%':(el.step==='0.1'?(+el.value).toFixed(1):el.value);
  }
  $('mut').disabled=!$('mutOn').checked;
  $('popB').disabled=!$('bOn').checked;
  $('spB').style.display=$('bOn').checked?'':'none';
}
function setInputs(d){
  $('food').value=d.food;$('mutOn').checked=d.mutOn;$('mut').value=d.mut;$('bOn').checked=d.bOn;$('rand').checked=d.rand;$('pred').checked=!!d.pred;$('water').checked=!!d.water;$('popA').value=d.popA;$('popB').value=d.popB;
  ['A','B'].forEach((L,sp)=>GENES.forEach(([g])=>{$(`t${L}_${g}`).value=d.tr[sp][g];}));
  labels();
}
function readCfg(){
  const tr=[0,1].map(sp=>{const L=sp?'B':'A',o={};GENES.forEach(([g])=>{o[g]=+$(`t${L}_${g}`).value;});return o;});
  const sv=$('seed').value.trim(),seed=/^\d{1,10}$/.test(sv)?Number(sv)%4294967296:undefined;
  return{seed,food:+$('food').value,pop:[+$('popA').value,$('bOn').checked?+$('popB').value:0],mutOn:$('mutOn').checked,mut:+$('mut').value/100,rand:$('rand').checked,pred:$('pred').checked,water:$('water').checked,timeline:curTL,traits:tr};
}
