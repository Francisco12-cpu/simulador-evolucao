// Entorno da ilha (só visual, não afeta a simulação): montanhas ao longe, ilhotas com palmeiras, farol, veleiros,
// gaivotas e nuvens. Tudo vem de js/modelos/ e usa instâncias: o entorno inteiro custa ~8 draw calls.
'use strict';

const Entorno=(function(){
  const rnd=mulberry32(20261011); // posições fixas: o cenário é o mesmo em toda execução
  const d=new THREE.Object3D(),TAU=Math.PI*2;

  // Montanhas: anel distante, coberto pela névoa.
  const NM=22,mont=Modelos.instancias('montanha',NM);
  for(let i=0;i<NM;i++){
    const a=i/NM*TAU+rnd()*0.2,r=230+rnd()*60,h=35+rnd()*50,w=25+rnd()*25;
    d.position.set(Math.cos(a)*r,-3,Math.sin(a)*r);d.rotation.set(0,rnd()*TAU,0);d.scale.set(w,h,w);d.updateMatrix();mont.setMatrixAt(i,d.matrix);
  }
  scene.add(mont);

  // Ilhotas com palmeiras e pedras.
  const ILH=[],NI=7,ilh=Modelos.instancias('ilhota',NI),palms=[],rocks=[];
  for(let i=0;i<NI;i++){
    const a=i/NI*TAU+0.5+rnd()*0.35,r=58+rnd()*34,k=3+rnd()*3.2,x=Math.cos(a)*r,z=Math.sin(a)*r;
    ILH.push({x,z,k});
    d.position.set(x,SEA_Y+0.75,z);d.rotation.set(0,rnd()*TAU,0);d.scale.set(k,k*0.75,k);d.updateMatrix();ilh.setMatrixAt(i,d.matrix);
    const np=1+Math.floor(rnd()*3);
    for(let j=0;j<np;j++){const aa=rnd()*TAU,rr=rnd()*k*0.45;palms.push([x+Math.cos(aa)*rr,SEA_Y+0.75+k*0.42,z+Math.sin(aa)*rr,0.75+rnd()*0.5,rnd()*TAU]);}
    for(let j=0;j<3;j++){const aa=rnd()*TAU,rr=k*(1.2+rnd()*0.5);rocks.push([x+Math.cos(aa)*rr,SEA_Y+0.1,z+Math.sin(aa)*rr,0.5+rnd()*0.9,rnd()*TAU]);}
  }
  scene.add(ilh);
  const palm=Modelos.instancias('palmeira',palms.length),rock=Modelos.instancias('pedra',rocks.length);
  palms.forEach(([x,y,z,s,ry],i)=>{d.position.set(x,y,z);d.rotation.set(0,ry,0);d.scale.setScalar(s*1.4);d.updateMatrix();palm.setMatrixAt(i,d.matrix);});
  rocks.forEach(([x,y,z,s,ry],i)=>{d.position.set(x,y,z);d.rotation.set(rnd()*0.4,ry,0);d.scale.setScalar(s);d.updateMatrix();rock.setMatrixAt(i,d.matrix);});
  scene.add(palm,rock);

  // Farol num rochedo, entre a ilha e as ilhotas.
  const farol=Modelos.malha('farol');farol.position.set(-44,SEA_Y+0.6,-30);farol.rotation.y=0.6;scene.add(farol);

  // Veleiros navegando em círculos ao redor da ilha.
  const BARCOS=[{r:38,w:0.035,f:0},{r:44,w:-0.028,f:2.2},{r:41,w:0.022,f:4.1}];
  const barcos=Modelos.instancias('veleiro',BARCOS.length,{dinamico:true});scene.add(barcos);

  // Gaivotas: bando circulando sobre a ilha, batendo as asas.
  const NG=12,GAIV=[];for(let i=0;i<NG;i++)GAIV.push({r:20+rnd()*24,h:24+rnd()*10,w:(0.18+rnd()*0.12)*(rnd()<0.3?-1:1),f:rnd()*TAU,bat:5+rnd()*3});
  const gaiv=Modelos.instancias('gaivota',NG,{dinamico:true});scene.add(gaiv);

  // Nuvens à deriva.
  const NN=9,NUV=[];for(let i=0;i<NN;i++)NUV.push({x:(rnd()-.5)*340,y:46+rnd()*26,z:(rnd()-.5)*300,s:0.8+rnd()*0.7,v:1+rnd()*0.8});
  const nuv=Modelos.instancias('nuvem',NN,{dinamico:true});scene.add(nuv);

  // Partes animadas não devem ser reposicionadas pelo relevo (applyTerrain).
  for(const m of [barcos,gaiv,nuv])dyn.add(m);

  let t=0;
  function atualizar(rdt){
    t+=rdt;
    BARCOS.forEach((b,i)=>{
      const a=b.f+t*b.w,x=Math.cos(a)*b.r,z=Math.sin(a)*b.r;
      d.position.set(x,SEA_Y+0.15+Math.sin(t*1.3+i)*0.08,z);d.rotation.set(Math.sin(t*1.1+i)*0.06,-a+(b.w>0?-Math.PI/2:Math.PI/2),Math.sin(t*0.9+i*2)*0.05);
      d.scale.setScalar(1.6);d.updateMatrix();barcos.setMatrixAt(i,d.matrix);
    });
    GAIV.forEach((g,i)=>{
      const a=g.f+t*g.w;
      d.position.set(Math.cos(a)*g.r,g.h+Math.sin(t*0.7+i)*1.2,Math.sin(a)*g.r);d.rotation.set(0,-a+(g.w>0?-Math.PI/2:Math.PI/2),(g.w>0?-1:1)*0.25);
      d.scale.set(0.8,0.8*(0.55+0.45*Math.sin(t*g.bat+i)),0.8);d.updateMatrix();gaiv.setMatrixAt(i,d.matrix);
    });
    NUV.forEach((n,i)=>{
      n.x+=rdt*n.v*1.4;if(n.x>190)n.x=-190;
      d.position.set(n.x,n.y,n.z);d.rotation.set(0,i,0);d.scale.setScalar(n.s);d.updateMatrix();nuv.setMatrixAt(i,d.matrix);
    });
    barcos.instanceMatrix.needsUpdate=gaiv.instanceMatrix.needsUpdate=nuv.instanceMatrix.needsUpdate=true;
  }
  atualizar(0);
  return {atualizar,ilhotas:ILH,farol};
})();
