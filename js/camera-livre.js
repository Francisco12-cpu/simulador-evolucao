// Câmera livre: andar pela ilha (os pés seguem o relevo) ou voar. Botão "Explorar" ou tecla F; Esc sai.
// PC: clique na tela para olhar com o mouse (pointer lock), WASD/setas movem, Shift corre, Espaço/C sobem e descem.
// Celular: joystick à esquerda move, arrastar à direita olha, botões ▲ ▼ sobem e descem no voo.
'use strict';

const CamLivre=(function(){
  const pos=new THREE.Vector3(),fwd=new THREE.Vector3(),right=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
  let ativa=false,voo=false,yaw=0,pitch=0,yView=0;
  const teclas=new Set(),joy={x:0,y:0,id:null,cx:0,cy:0},olhar={id:null,x:0,y:0},sobe={v:0};
  const ui=$('livreUI'),stick=$('lvStick'),knob=$('lvKnob');
  const toque=matchMedia('(pointer: coarse)').matches;
  const EYE=1.5,LIM_ANDAR=R-0.5,LIM_VOO=220;

  function chao(x,z){return Math.max(H(x,z),Math.hypot(x,z)>R+0.5?SEA_Y:0);}
  function entrar(){
    if(ativa)return;ativa=true;modoLivre=true;document.body.classList.add('livre');
    camera.clearViewOffset();camera.fov=70;camera.near=0.1;camera.updateProjectionMatrix();
    definirVoo(voo,true);
    ui.querySelector('.dica').textContent=toque?'Joystick à esquerda para andar · arraste à direita para olhar':'Clique na tela para olhar com o mouse · WASD ou setas · Shift corre · Espaço/C sobem e descem (voo) · Esc sai';
    toast(voo?'Modo voo':'Modo andar: passeie entre as criaturas');
  }
  function sair(){
    if(!ativa)return;ativa=false;modoLivre=false;document.body.classList.remove('livre');teclas.clear();
    if(document.pointerLockElement)document.exitPointerLock();
    camera.fov=45;camera.near=0.5;resize();
  }
  function definirVoo(v,reposicionar){
    voo=v;$('lvAndar').classList.toggle('on',!v);$('lvVoar').classList.toggle('on',v);$('lvAndar').setAttribute('aria-pressed',String(!v));$('lvVoar').setAttribute('aria-pressed',String(v));
    ui.classList.toggle('voo',v);
    if(reposicionar){
      if(v){pos.set(0,28,52);yaw=0;pitch=-0.45;}
      else{pos.set(0,0,R-3);yaw=0;pitch=-0.12;pos.y=chao(pos.x,pos.z)+EYE;}
    }else if(!v){pos.y=chao(pos.x,pos.z)+EYE;}
    yView=pos.y;
  }
  function atualizar(rdt){
    // direção
    fwd.set(-Math.sin(yaw),0,-Math.cos(yaw));right.crossVectors(fwd,UP);
    let mx=joy.x,mz=-joy.y;
    if(teclas.has('KeyW')||teclas.has('ArrowUp'))mz+=1;
    if(teclas.has('KeyS')||teclas.has('ArrowDown'))mz-=1;
    if(teclas.has('KeyA')||teclas.has('ArrowLeft'))mx-=1;
    if(teclas.has('KeyD')||teclas.has('ArrowRight'))mx+=1;
    const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}
    const corre=teclas.has('ShiftLeft')||teclas.has('ShiftRight');
    const v=(voo?14:5.5)*(corre?2.3:1)*rdt;
    pos.addScaledVector(fwd,mz*v).addScaledVector(right,mx*v);
    if(voo){
      let up=sobe.v;if(teclas.has('Space')||teclas.has('KeyE'))up+=1;if(teclas.has('KeyC')||teclas.has('KeyQ'))up-=1;
      pos.y+=up*v;
      const r=Math.hypot(pos.x,pos.z);if(r>LIM_VOO){pos.x*=LIM_VOO/r;pos.z*=LIM_VOO/r;}
      pos.y=clamp(pos.y,chao(pos.x,pos.z)+0.8,160);yView=pos.y;
    }else{
      const r=Math.hypot(pos.x,pos.z);if(r>LIM_ANDAR){pos.x*=LIM_ANDAR/r;pos.z*=LIM_ANDAR/r;}
      pos.y=chao(pos.x,pos.z)+EYE;yView+=(pos.y-yView)*Math.min(1,rdt*10); // suaviza degraus do relevo
    }
    camera.position.set(pos.x,yView,pos.z);
    camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
  }
  const girar=(dx,dy,k)=>{yaw-=dx*k;pitch=clamp(pitch-dy*k,-1.5,1.5);};

  // PC: mouse com pointer lock
  canvas.addEventListener('click',()=>{if(ativa&&!toque&&!document.pointerLockElement&&canvas.requestPointerLock)canvas.requestPointerLock();});
  addEventListener('mousemove',e=>{if(ativa&&document.pointerLockElement===canvas)girar(e.movementX,e.movementY,0.0024);});
  addEventListener('keydown',e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(e.code==='KeyF'){ativa?sair():entrar();return;}
    if(!ativa)return;
    if(e.code==='Escape'){sair();return;}
    if(e.code==='KeyV'){definirVoo(!voo,false);return;}
    teclas.add(e.code);if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();
  });
  addEventListener('keyup',e=>teclas.delete(e.code));
  addEventListener('blur',()=>teclas.clear());
  document.addEventListener('pointerlockchange',()=>{ui.classList.toggle('travado',document.pointerLockElement===canvas);});

  // Celular: joystick e arrastar para olhar
  canvas.addEventListener('pointerdown',e=>{
    if(!ativa||e.pointerType==='mouse')return;
    if(e.clientX<innerWidth*0.45&&joy.id===null){joy.id=e.pointerId;joy.cx=e.clientX;joy.cy=e.clientY;stick.style.left=e.clientX+'px';stick.style.top=e.clientY+'px';stick.classList.add('on');}
    else if(olhar.id===null){olhar.id=e.pointerId;olhar.x=e.clientX;olhar.y=e.clientY;}
  });
  canvas.addEventListener('pointermove',e=>{
    if(!ativa)return;
    if(e.pointerId===joy.id){const dx=e.clientX-joy.cx,dy=e.clientY-joy.cy,d=Math.hypot(dx,dy),m=Math.min(d,50),k=d?m/d:0;joy.x=dx*k/50;joy.y=dy*k/50;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`;}
    else if(e.pointerId===olhar.id){girar(e.clientX-olhar.x,e.clientY-olhar.y,0.005);olhar.x=e.clientX;olhar.y=e.clientY;}
  });
  const solta=e=>{
    if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;knob.style.transform='';stick.classList.remove('on');}
    if(e.pointerId===olhar.id)olhar.id=null;
  };
  canvas.addEventListener('pointerup',solta);canvas.addEventListener('pointercancel',solta);
  for(const [id,v] of [['lvSobe',1],['lvDesce',-1]]){
    const b=$(id);
    b.addEventListener('pointerdown',e=>{e.preventDefault();sobe.v=v;});
    for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,()=>{sobe.v=0;});
  }

  $('bLivre').addEventListener('click',()=>ativa?sair():entrar());
  $('fLivre').addEventListener('click',()=>{closeSheets();ativa?sair():entrar();});
  $('lvSair').addEventListener('click',sair);
  $('lvAndar').addEventListener('click',()=>definirVoo(false,false));
  $('lvVoar').addEventListener('click',()=>{if(!voo){definirVoo(true,false);pos.y=Math.max(pos.y,8);yView=pos.y;}});

  return {get ativa(){return ativa;},entrar,sair,atualizar};
})();
