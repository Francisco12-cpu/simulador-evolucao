// Modelos feitos pelo homem e animais: farol, veleiro e gaivota. Ver js/modelos/base.js.
'use strict';

// Farol: rochedo, torre listrada em vermelho e branco, varanda, lanterna amarela e teto vermelho. Altura ~9.
Modelos.registrar('farol',()=>{
  const P=[Modelos.parte(new THREE.DodecahedronGeometry(2.4,0),0xA7B0BE,{p:[0,-0.6,0],s:[1.2,0.7,1.1]}),
    Modelos.parte(new THREE.CylinderGeometry(1.6,2.2,0.6,10),0xEFD9A0,{p:[0,0.6,0]})];
  for(let i=0;i<6;i++)P.push(Modelos.parte(new THREE.CylinderGeometry(0.95-i*0.08-0.08,0.95-i*0.08,1,12),i%2?0xFFFFFF:0xE5484D,{p:[0,1.4+i,0]}));
  P.push(Modelos.parte(new THREE.CylinderGeometry(0.85,0.85,0.14,14),0x334155,{p:[0,7,0]}));
  P.push(Modelos.parte(new THREE.CylinderGeometry(0.42,0.42,0.75,10),0xFFE27A,{p:[0,7.45,0]}));
  P.push(Modelos.parte(new THREE.ConeGeometry(0.62,0.8,10),0xE5484D,{p:[0,8.2,0]}));
  return P;
});

// Veleiro: casco, convés, mastro, vela branca e bandeirinha verde. Comprimento ~3.
Modelos.registrar('veleiro',()=>[
  Modelos.parte(new THREE.CylinderGeometry(0.62,0.3,3,8,1),0xF4F1EA,{p:[0,0.15,0],r:[0,0,Math.PI/2],s:[1,1,0.62]}),
  Modelos.parte(new THREE.BoxGeometry(2.3,0.12,0.62),0xB98B5E,{p:[0,0.5,0]}),
  Modelos.parte(new THREE.BoxGeometry(2.9,0.12,0.7),0x2F9A5E,{p:[0,-0.05,0],s:[1,1,0.9]}),
  Modelos.parte(new THREE.CylinderGeometry(0.05,0.06,3.2,6),0x6B4A2B,{p:[0.2,2.1,0]}),
  Modelos.parte(new THREE.ConeGeometry(1.15,2.7,3),0xFFFFFF,{p:[-0.35,2.05,0],r:[0,Math.PI/2,0],s:[1,1,0.08]}),
  Modelos.parte(new THREE.BoxGeometry(0.5,0.28,0.03),0x2F9A5E,{p:[0.45,3.6,0]}),
]);

// Gaivota: corpo, cabeça, bico amarelo e asas em V (o bater de asas é feito escalando a instância).
Modelos.registrar('gaivota',()=>[
  Modelos.parte(new THREE.SphereGeometry(0.22,6,4),0xFFFFFF,{s:[1.8,0.8,0.8]}),
  Modelos.parte(new THREE.SphereGeometry(0.13,6,4),0xFFFFFF,{p:[0.38,0.08,0]}),
  Modelos.parte(new THREE.ConeGeometry(0.05,0.18,4),0xF5B60A,{p:[0.55,0.06,0],r:[0,0,-Math.PI/2]}),
  Modelos.parte(new THREE.BoxGeometry(0.36,0.03,0.95),0xE8EEF5,{p:[0,0.12,0.45],r:[-0.42,0,0]}),
  Modelos.parte(new THREE.BoxGeometry(0.36,0.03,0.95),0xE8EEF5,{p:[0,0.12,-0.45],r:[0.42,0,0]}),
  Modelos.parte(new THREE.BoxGeometry(0.2,0.031,0.3),0x5D6B8A,{p:[0,0.3,0.86],r:[-0.42,0,0]}),
  Modelos.parte(new THREE.BoxGeometry(0.2,0.031,0.3),0x5D6B8A,{p:[0,0.3,-0.86],r:[0.42,0,0]}),
]);
