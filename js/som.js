// Sons simples sintetizados com Web Audio (sem arquivos). O áudio só começa depois do primeiro toque ou clique,
// como os navegadores exigem. Liga/desliga com o botão de som ou a tecla M; a escolha fica salva.
'use strict';

const Som=(function(){
  let ctx=null,master=null,ligado=true,last={};
  try{ligado=localStorage.getItem('evo_som')!=='0';}catch(e){}
  function init(){
    if(ctx)return;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    ctx=new AC();master=ctx.createGain();master.gain.value=0.5;master.connect(ctx.destination);
  }
  // Não tocar o mesmo som mais de uma vez a cada `ms` milissegundos (a 30× seriam centenas por segundo).
  const pode=(k,ms)=>{const t=performance.now();if(last[k]&&t-last[k]<ms)return false;last[k]=t;return true;};
  function tom(freq,dur,{tipo='sine',vol=0.15,ataque=0.005,glide=0,atraso=0}={}){
    if(!ctx||!ligado)return;
    const t0=ctx.currentTime+atraso,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=tipo;o.frequency.setValueAtTime(freq,t0);if(glide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*glide),t0+dur);
    g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+ataque);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+0.02);
  }
  function ruido(dur,{vol=0.12,freq=800,q=0.8,tipo='lowpass',atraso=0}={}){
    if(!ctx||!ligado)return;
    const t0=ctx.currentTime+atraso,n=Math.floor(ctx.sampleRate*dur),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=b;f.type=tipo;f.frequency.value=freq;f.Q.value=q;
    g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    s.connect(f);f.connect(g);g.connect(master);s.start(t0);
  }
  const API={
    get ligado(){return ligado;},
    alternar(){ligado=!ligado;try{localStorage.setItem('evo_som',ligado?'1':'0');}catch(e){}if(ligado){init();API.clique();}return ligado;},
    clique(){if(pode('clique',40))tom(880,0.05,{tipo:'triangle',vol:0.05});},
    comer(){if(pode('comer',120))tom(1180+Math.random()*240,0.08,{tipo:'sine',vol:0.05,glide:1.25});},
    nascer(){if(pode('nascer',160)){tom(660,0.12,{tipo:'triangle',vol:0.06});tom(990,0.14,{tipo:'triangle',vol:0.05,atraso:0.07});}},
    dia(){if(pode('dia',800)){tom(523,0.5,{vol:0.05,ataque:0.04});tom(659,0.5,{vol:0.04,ataque:0.04,atraso:0.06});tom(784,0.6,{vol:0.04,ataque:0.04,atraso:0.12});}},
    extintos(){tom(440,0.35,{tipo:'triangle',vol:0.08,glide:0.5});tom(330,0.5,{tipo:'triangle',vol:0.07,glide:0.5,atraso:0.25});},
    evento(k){
      if(k==='seca')ruido(1.2,{vol:0.07,freq:500,q:0.5});
      else if(k==='chuva'){ruido(1.5,{vol:0.08,freq:2500,tipo:'highpass'});}
      else if(k==='frio'){[1568,1976,2349].forEach((f,i)=>tom(f,0.6,{vol:0.03,atraso:i*0.08}));}
      else if(k==='calor')tom(220,0.8,{tipo:'sawtooth',vol:0.03,glide:1.5,ataque:0.2});
      else if(k==='ameno'){tom(587,0.3,{vol:0.05});tom(784,0.4,{vol:0.05,atraso:0.1});}
      else if(k==='radiacao'){for(let i=0;i<5;i++)tom(1400+Math.random()*900,0.05,{tipo:'square',vol:0.025,atraso:i*0.09});}
      else if(k==='extincao'){ruido(1.6,{vol:0.22,freq:180,q:0.7,atraso:1.1});tom(90,1.4,{tipo:'sine',vol:0.18,glide:0.4,atraso:1.1});}
    },
  };
  // Primeiro gesto do usuário destrava o áudio.
  // (pointerup e não pointerdown: no celular o navegador só conta o toque como gesto quando o dedo sai da tela)
  const destrava=e=>{if(!e.isTrusted)return;init();if(ctx&&ctx.state==='suspended')ctx.resume();};
  addEventListener('pointerup',destrava,{passive:true});
  addEventListener('keydown',destrava);
  return API;
})();
