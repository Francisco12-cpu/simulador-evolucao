// Sons simples sintetizados com Web Audio (sem arquivos). O áudio só começa depois do primeiro toque ou clique,
// como os navegadores exigem. Liga/desliga com o botão de som ou a tecla M; a escolha fica salva.
// A música de fundo é uma versão calma da trilha do trailer (divulgacao/), gerada ao vivo: acordes Dó, Lá menor,
// Fá e Sol, arpejo suave e, a cada quatro compassos, o motivo Dó–Mi–Sol que toca no começo de cada dia.
'use strict';

const Som=(function(){
  let ctx=null,master=null,ligado=true,musicaOn=true,last={};
  try{ligado=localStorage.getItem('evo_som')!=='0';musicaOn=localStorage.getItem('evo_musica')!=='0';}catch(e){}
  function init(){
    if(ctx)return;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    ctx=new AC();master=ctx.createGain();master.gain.value=0.5;master.connect(ctx.destination);
    atualizarMusica();
  }
  // ===== Música de fundo =====
  const BAR=2.4,PROG=[['C4','E4','G4'],['A3','C4','E4'],['F3','A3','C4'],['G3','B3','D4']];
  const NT={C:0,D:2,E:4,F:5,G:7,A:9,B:11},nota=s=>440*Math.pow(2,(12*(+s.slice(-1)+1)+NT[s[0]]-69)/12);
  let bus=null,timer=null,proxima=0,compasso=0;
  function voz(tipo,f,t,dur,vol,dest,{ataque=0.006,det=0}={}){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=tipo;o.frequency.value=f;o.detune.value=det;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+ataque);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+0.05);
  }
  function tocarCompasso(t,b){
    const ac=PROG[b%4];
    const pad=ctx.createGain(),f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=850;f.connect(pad);pad.connect(bus);
    pad.gain.setValueAtTime(0.0001,t);pad.gain.linearRampToValueAtTime(0.022,t+0.9);pad.gain.linearRampToValueAtTime(0.0001,t+BAR+0.6);
    for(const s of ac)for(const d of [-7,7]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=nota(s)/2;o.detune.value=d;o.connect(f);o.start(t);o.stop(t+BAR+0.7);}
    const arp=[ac[0],ac[1],ac[2],ac[1]];
    for(let i=0;i<8;i++)voz('triangle',nota(arp[i%4])*2,t+i*BAR/8,0.5,0.022,bus);
    if(b%4===0)[['C5',0],['E5',0.3],['G5',0.6]].forEach(([s,dt])=>{voz('sine',nota(s),t+dt,1.6,0.03,bus,{ataque:0.004});voz('sine',nota(s)*2.76,t+dt,0.5,0.006,bus,{ataque:0.002});});
  }
  function atualizarMusica(){
    if(!ctx)return;
    const tocar=ligado&&musicaOn;
    if(!bus){bus=ctx.createGain();bus.gain.value=0;bus.connect(master);}
    const t=ctx.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(tocar?1:0,t+(tocar?2:0.6));
    if(tocar&&!timer){
      proxima=Math.max(proxima,t+0.1);
      timer=setInterval(()=>{if(ctx.state!=='running')return;while(proxima<ctx.currentTime+1.2){tocarCompasso(proxima,compasso++);proxima+=BAR;}},300);
    }else if(!tocar&&timer){setTimeout(()=>{if(!(ligado&&musicaOn)&&timer){clearInterval(timer);timer=null;}},700);}
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
    alternar(){ligado=!ligado;try{localStorage.setItem('evo_som',ligado?'1':'0');}catch(e){}if(ligado){init();API.clique();}atualizarMusica();return ligado;},
    get musica(){return musicaOn;},
    definirMusica(v){musicaOn=!!v;try{localStorage.setItem('evo_musica',musicaOn?'1':'0');}catch(e){}if(musicaOn)init();atualizarMusica();},
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
