// Biblioteca de modelos 3D reutilizáveis.
//
// Cada modelo é uma lista de peças simples do Three.js (caixas, cilindros, cones...) com uma cor. Na primeira vez
// que é pedido, Modelos.geo(nome) funde as peças numa única BufferGeometry com cor por vértice e guarda em cache.
// Todos os modelos usam o mesmo material (Modelos.material). Por isso cada modelo custa um draw call, e com
// Modelos.instancias(nome, n) dezenas de cópias continuam custando um draw call só.
//
// Para criar um modelo novo: um arquivo em js/modelos/ com
//   Modelos.registrar('nome', rand => [ Modelos.parte(geometria, cor, {p, r, s}), ... ]);
// e um <script src="js/modelos/nome.js"> no index.html, depois deste arquivo. `rand` é um gerador com seed fixa,
// então o modelo sai igual em toda execução.
'use strict';

const Modelos=(function(){
  const cache=new Map(),fabricas=new Map();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.85,metalness:0});
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),eu=new THREE.Euler(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),cor=new THREE.Color();

  // Uma peça: geometria + cor + posição (p), rotação em radianos (r) e escala (s).
  function parte(geo,hex,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={}){
    m4.compose(vp.set(...p),q.setFromEuler(eu.set(...r)),vs.set(...(typeof s==='number'?[s,s,s]:s)));
    return {geo,hex,matrix:m4.clone()};
  }
  // Funde as peças numa geometria só (não indexada, com normal e cor por vértice).
  function mesclar(partes){
    const pos=[],nor=[],col=[];
    for(const pt of partes){
      const g=(pt.geo.index?pt.geo.toNonIndexed():pt.geo.clone()).applyMatrix4(pt.matrix);
      g.computeVertexNormals();
      const P=g.attributes.position.array,N=g.attributes.normal.array;cor.set(pt.hex);
      for(let i=0;i<P.length;i++){pos.push(P[i]);nor.push(N[i]);}
      for(let i=0;i<P.length/3;i++)col.push(cor.r,cor.g,cor.b);
      g.dispose();pt.geo.dispose();
    }
    const out=new THREE.BufferGeometry();
    out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
    out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    out.computeBoundingSphere();
    return out;
  }
  function registrar(nome,fabrica){fabricas.set(nome,fabrica);}
  function geo(nome){
    if(!cache.has(nome)){
      const f=fabricas.get(nome);if(!f)throw new Error('Modelo desconhecido: '+nome);
      cache.set(nome,mesclar(f(mulberry32(nome.length*7919+nome.charCodeAt(0)))));
    }
    return cache.get(nome);
  }
  function malha(nome,{sombra=false}={}){const m=new THREE.Mesh(geo(nome),material);m.castShadow=sombra;m.receiveShadow=sombra;return m;}
  function instancias(nome,n,{sombra=false,dinamico=false}={}){
    const m=new THREE.InstancedMesh(geo(nome),material,n);m.castShadow=sombra;m.receiveShadow=sombra;
    if(dinamico){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;}
    return m;
  }
  return {parte,registrar,geo,malha,instancias,material,lista:()=>[...fabricas.keys()]};
})();
