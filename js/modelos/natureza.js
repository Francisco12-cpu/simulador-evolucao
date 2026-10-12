// Modelos de natureza: palmeira, pedra, ilhota, nuvem e montanha. Ver js/modelos/base.js.
'use strict';

// Palmeira: tronco curvo em gomos, coroa de folhas caídas e cocos. Altura ~4,5 (escala 1).
Modelos.registrar('palmeira',rand=>{
  const P=[],tr=0x9B7653,tr2=0x86633F,folha=[0x3FA25A,0x2F9A5E,0x4DB577];
  let x=0,y=0,inc=0;
  for(let i=0;i<6;i++){
    const h=0.62;inc+=0.07;
    P.push(Modelos.parte(new THREE.CylinderGeometry(0.15-i*0.012,0.19-i*0.012,h+0.06,7),i%2?tr:tr2,{p:[x,y+h/2,0],r:[0,0,-inc]}));
    x+=Math.sin(inc)*h;y+=Math.cos(inc)*h;
  }
  for(let k=0;k<7;k++){
    const a=k/7*Math.PI*2+rand()*0.3;
    P.push(Modelos.parte(new THREE.ConeGeometry(0.34,2.1,4),folha[k%3],{p:[x+Math.cos(a)*0.85,y-0.15,Math.sin(a)*0.85],r:[Math.sin(a)*1.25,0,-Math.cos(a)*1.25],s:[1,1,0.28]}));
  }
  for(let k=0;k<3;k++){const a=k*2.1;P.push(Modelos.parte(new THREE.IcosahedronGeometry(0.15,0),0x6B4A2B,{p:[x+Math.cos(a)*0.2,y-0.22,Math.sin(a)*0.2]}));}
  return P;
});

// Pedra: dodecaedro achatado com uma lasca, em dois tons de cinza.
Modelos.registrar('pedra',()=>[
  Modelos.parte(new THREE.DodecahedronGeometry(1,0),0xA7B0BE,{s:[1,0.62,0.85]}),
  Modelos.parte(new THREE.DodecahedronGeometry(0.55,0),0x8E98A8,{p:[0.7,-0.1,0.3],s:[1,0.7,1]}),
]);

// Ilhota: base de areia que afunda no mar, gramado e duas pedras. Raio ~1 (escala por instância).
Modelos.registrar('ilhota',()=>[
  Modelos.parte(new THREE.CylinderGeometry(1,1.45,1.6,11),0xEFD9A0,{p:[0,-0.5,0]}),
  Modelos.parte(new THREE.CylinderGeometry(0.72,0.95,0.35,11),0x6FC24F,{p:[0,0.42,0]}),
  Modelos.parte(new THREE.DodecahedronGeometry(0.22,0),0xA7B0BE,{p:[0.85,0.32,0.25],s:[1,0.6,1]}),
  Modelos.parte(new THREE.DodecahedronGeometry(0.16,0),0x8E98A8,{p:[-0.55,0.3,-0.7],s:[1,0.6,1]}),
]);

// Nuvem: cinco bolhas brancas fundidas, achatadas embaixo.
Modelos.registrar('nuvem',rand=>{
  const P=[];
  for(let j=0;j<5;j++){const r=4+rand()*3.5;P.push(Modelos.parte(new THREE.IcosahedronGeometry(r,1),j%2?0xFFFFFF:0xF4F8FF,{p:[j*6-12,rand()*2.2,(rand()-.5)*5],s:[1,0.62,1]}));}
  return P;
});

// Montanha distante: cone azulado com topo nevado.
Modelos.registrar('montanha',()=>[
  Modelos.parte(new THREE.ConeGeometry(1,1,6),0x8EA6C4,{p:[0,0.5,0]}),
  Modelos.parte(new THREE.ConeGeometry(0.34,0.34,6),0xF4F8FF,{p:[0,0.84,0]}),
]);
