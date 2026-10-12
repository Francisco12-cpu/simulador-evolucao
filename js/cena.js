// Cena 3D: céu, ilha, água, clima, partículas, criaturas e terreno.
// Parte do simulador Evolução. Scripts clássicos (sem build): a ordem de carregamento está no index.html
// e as declarações de nível superior são compartilhadas entre os arquivos.
'use strict';

// ===== Cena 3D =====
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const SKY=0xbfe4ff;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(SKY,150,430);
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color(0x7fc4ff)},bot:{value:new THREE.Color(SKY)}},
  vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 top;uniform vec3 bot;varying float h;void main(){gl_FragColor=vec4(mix(bot,top,smoothstep(-0.05,0.6,h)),1.);}'});
const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),skyMat);sky.renderOrder=-1;scene.add(sky);
const camera=new THREE.PerspectiveCamera(45,1,0.5,1200);

const hemi=new THREE.HemisphereLight(0xe6f4ff,0xa4c690,0.58);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,0.58);
sun.position.set(38,62,24);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:10,far:170});sun.shadow.bias=-0.0006;
scene.add(sun);

function groundTexture(){
  const s=1024,cv=document.createElement('canvas');cv.width=cv.height=s;const g=cv.getContext('2d');
  g.fillStyle='#8fd36c';g.fillRect(0,0,s,s);
  const greens=['#7ec95b','#9bdb78','#86cf63','#a6e085','#74c254'];
  for(let i=0;i<900;i++){
    const a=Math.random()*6.283,r=Math.sqrt(Math.random())*s*0.46;
    g.globalAlpha=0.18+Math.random()*0.22;g.fillStyle=greens[i%greens.length];
    g.beginPath();g.arc(s/2+Math.cos(a)*r,s/2+Math.sin(a)*r,6+Math.random()*30,0,6.283);g.fill();
  }
  g.globalAlpha=1;
  const sand=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  sand.addColorStop(0,'rgba(243,226,171,0)');sand.addColorStop(0.855,'rgba(243,226,171,0)');sand.addColorStop(0.915,'rgba(243,226,171,1)');sand.addColorStop(1,'rgba(235,214,150,1)');
  g.fillStyle=sand;g.fillRect(0,0,s,s);
  for(let i=0;i<500;i++){
    const a=Math.random()*6.283,r=s*(0.45+Math.random()*0.05);
    g.globalAlpha=0.25;g.fillStyle=Math.random()<.5?'#e6cd8a':'#fff3c9';
    g.beginPath();g.arc(s/2+Math.cos(a)*r,s/2+Math.sin(a)*r,2+Math.random()*5,0,6.283);g.fill();
  }
  const t=new THREE.CanvasTexture(cv);t.anisotropy=8;return t;
}
const ground=new THREE.Mesh(new THREE.RingGeometry(0.01,R+0.5,96,48),new THREE.MeshStandardMaterial({map:groundTexture(),roughness:.95}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const lip=new THREE.Mesh(new THREE.CylinderGeometry(R+0.5,R+0.5,0.9,96,1,true),new THREE.MeshStandardMaterial({color:0xe3cf93,roughness:1,side:THREE.DoubleSide}));
lip.position.y=-0.45;scene.add(lip);
const earth=new THREE.Mesh(new THREE.CylinderGeometry(R+0.5,R-6,8,64,3,true),new THREE.MeshStandardMaterial({color:0x9c7a55,roughness:1,flatShading:true,side:THREE.DoubleSide}));
earth.position.y=-4.9;earth.receiveShadow=true;scene.add(earth);
const water=new THREE.Mesh(new THREE.CircleGeometry(900,64),new THREE.MeshStandardMaterial({color:0x4fb3e6,roughness:.25,metalness:.05,transparent:true,opacity:.95}));
water.rotation.x=-Math.PI/2;water.position.y=SEA_Y;water.receiveShadow=true;scene.add(water);
const foam=new THREE.Mesh(new THREE.RingGeometry(R+0.6,R+2.6,96),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));
foam.rotation.x=-Math.PI/2;foam.position.y=SEA_Y+0.04;scene.add(foam);

const lake=new THREE.Mesh(new THREE.CircleGeometry(1,56),new THREE.MeshStandardMaterial({color:0x4fb3e6,roughness:.15,metalness:.1,transparent:true,opacity:.85}));
lake.rotation.x=-Math.PI/2;lake.position.set(LAKE.x,0.06,LAKE.z);lake.visible=false;lake.receiveShadow=true;scene.add(lake);
const lakeRing=new THREE.Mesh(new THREE.RingGeometry(0.93,1,56),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));
lakeRing.rotation.x=-Math.PI/2;lakeRing.position.set(LAKE.x,0.08,LAKE.z);lakeRing.visible=false;scene.add(lakeRing);
const lake2=lake.clone(),lakeRing2=lakeRing.clone();
lake2.position.set(LAKES[1].x,0.06,LAKES[1].z);lakeRing2.position.set(LAKES[1].x,0.08,LAKES[1].z);scene.add(lake2,lakeRing2);
const lakeMeshes=[lake,lakeRing,lake2,lakeRing2];
let lk=1,lakeWas=null;
function updateLake(rdt){
  const on=!!(World.cfg&&World.cfg.water);for(const m of lakeMeshes)m.visible=on;
  if(on!==lakeWas){lakeWas=on;applyTerrain();}
  if(!on)return;
  lk+=(lakeK()-lk)*Math.min(1,rdt*2);
  const w=1+0.012*Math.sin(T*1.5);
  lake.scale.setScalar(LAKES[0].r*lk);lakeRing.scale.setScalar(LAKES[0].r*lk*w);lake2.scale.setScalar(LAKES[1].r*lk);lakeRing2.scale.setScalar(LAKES[1].r*lk*w);
  lake.material.color.copy(water.material.color);
}
const dummy=new THREE.Object3D(),tmpC=new THREE.Color();
(function decor(){
  const tuft=new THREE.InstancedMesh(new THREE.ConeGeometry(0.26,0.8,5).translate(0,0.4,0),new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),130);
  const gs=['#5fb446','#6fc24f','#52a53d','#7ccf58'];
  for(let i=0;i<130;i++){
    const r=Math.sqrt(Math.random())*(R-3.3),a=Math.random()*6.283;
    dummy.position.set(Math.cos(a)*r,0,Math.sin(a)*r);dummy.rotation.set(0,Math.random()*6,0);dummy.scale.setScalar(0.7+Math.random()*0.8);dummy.updateMatrix();
    tuft.setMatrixAt(i,dummy.matrix);tuft.setColorAt(i,tmpC.set(gs[i%4]));
  }
  scene.add(tuft);
  const fl=new THREE.InstancedMesh(new THREE.SphereGeometry(0.17,8,6).translate(0,0.2,0),new THREE.MeshStandardMaterial({roughness:.6}),60);
  const fc=['#ffd1dc','#fff3b0','#ffffff','#d9c2f0'];
  for(let i=0;i<60;i++){
    const r=Math.sqrt(Math.random())*(R-3.3),a=Math.random()*6.283;
    dummy.position.set(Math.cos(a)*r,0,Math.sin(a)*r);dummy.rotation.set(0,0,0);dummy.scale.setScalar(0.8+Math.random()*0.6);dummy.updateMatrix();
    fl.setMatrixAt(i,dummy.matrix);fl.setColorAt(i,tmpC.set(fc[i%4]));
  }
  scene.add(fl);
})();

const crownMat=new THREE.MeshStandardMaterial({color:0x5fb446,roughness:.9,flatShading:true});
{
  const NT=16,trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22,0.32,1.6,6).translate(0,0.8,0),new THREE.MeshStandardMaterial({color:0x8b6a4a,roughness:1}),NT);
  const crown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5,0).translate(0,2.7,0),crownMat,NT);
  const rock=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.7,0),new THREE.MeshStandardMaterial({color:0xa9b2bf,roughness:1,flatShading:true}),14);
  for(let i=0;i<NT;i++){
    const a=i/NT*6.283+Math.random()*0.3,r=R-4.4+Math.random()*1.3,k=0.75+Math.random()*0.4;
    dummy.position.set(Math.cos(a)*r,0,Math.sin(a)*r);dummy.rotation.set(0,Math.random()*6,0);dummy.scale.set(k,k*(0.9+Math.random()*0.3),k);dummy.updateMatrix();
    trunk.setMatrixAt(i,dummy.matrix);crown.setMatrixAt(i,dummy.matrix);
  }
  for(let i=0;i<14;i++){
    const a=Math.random()*6.283,r=Math.sqrt(Math.random())*(R-7),k=0.5+Math.random()*0.7;
    dummy.position.set(Math.cos(a)*r,0.15,Math.sin(a)*r);dummy.rotation.set(Math.random(),Math.random()*6,0);dummy.scale.set(k,k*0.7,k);dummy.updateMatrix();rock.setMatrixAt(i,dummy.matrix);
  }
  for(const m of [trunk,crown,rock]){m.castShadow=true;m.receiveShadow=true;scene.add(m);}
}
// O entorno (ilhotas, montanhas, nuvens, barcos, gaivotas) fica em js/entorno.js, com modelos de js/modelos/.

// Clima: céu, chão, mar e luz mudam de cor; neve cai quando esfria
const C_SKY=[new THREE.Color(0xd3e4f4),new THREE.Color(0xbfe4ff),new THREE.Color(0xffe0b8)];
const C_GRD=[new THREE.Color(0xe6efff),new THREE.Color(0xffffff),new THREE.Color(0xffdca8)];
const C_WAT=[new THREE.Color(0x86b9d8),new THREE.Color(0x4fb3e6),new THREE.Color(0x3fbfd0)];
const C_SUN=[new THREE.Color(0xe8f0ff),new THREE.Color(0xfff1d6),new THREE.Color(0xffd9a0)];
const C_TREE=[new THREE.Color(0xeaf4ff),new THREE.Color(0x5fb446),new THREE.Color(0xcfa84a)];
const C_NB=new THREE.Color(0x2c3b70),C_NT=new THREE.Color(0x090f2c),C_DT=new THREE.Color(0x5aaef5),tmpT=new THREE.Color();
const tmpS=new THREE.Color();let climVis=0,nightK=0;
const starPos=new Float32Array(900);
for(let i=0;i<300;i++){const u=Math.random()*6.283,v=Math.acos(0.15+Math.random()*0.85);starPos[i*3]=700*Math.sin(v)*Math.cos(u);starPos[i*3+1]=700*Math.cos(v);starPos[i*3+2]=700*Math.sin(v)*Math.sin(u);}
const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:2.2,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));
stars.visible=false;stars.frustumCulled=false;scene.add(stars);
const mix3=(arr,t,out)=>t<0?out.copy(arr[1]).lerp(arr[0],-t):out.copy(arr[1]).lerp(arr[2],t);
const snowN=450,snowPos=new Float32Array(snowN*3);
for(let i=0;i<snowN;i++){snowPos[i*3]=(Math.random()-.5)*110;snowPos[i*3+1]=Math.random()*45;snowPos[i*3+2]=(Math.random()-.5)*110;}
const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:0.55,transparent:true,opacity:0,depthWrite:false}));
snow.frustumCulled=false;snow.visible=false;scene.add(snow);
const rainPos=new Float32Array(1800);for(let i=0;i<600;i++){rainPos[i*3]=(Math.random()-.5)*110;rainPos[i*3+1]=Math.random()*45;rainPos[i*3+2]=(Math.random()-.5)*110;}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x9fd0ff,size:0.28,transparent:true,opacity:0.7,depthWrite:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
function applyClimate(rdt){
  climVis+=(World.temp-climVis)*Math.min(1,rdt*1.2);
  nightK+=((isDark()?1:0)-nightK)*Math.min(1,rdt*2);
  mix3(C_SKY,climVis,tmpS);tmpT.copy(tmpS).lerp(C_DT,0.55);tmpS.lerp(C_NB,nightK);tmpT.lerp(C_NT,nightK);
  skyMat.uniforms.bot.value.copy(tmpS);skyMat.uniforms.top.value.copy(tmpT);scene.fog.color.copy(tmpS);
  const dim=1-0.5*nightK;
  mix3(C_GRD,climVis,ground.material.color).multiplyScalar(dim);mix3(C_WAT,climVis,water.material.color).multiplyScalar(dim);
  mix3(C_SUN,climVis,sun.color).lerp(C_NB,nightK*0.5);mix3(C_TREE,climVis,crownMat.color).multiplyScalar(dim);
  sun.intensity=0.58*(1-0.6*nightK);hemi.intensity=0.58*(1-0.5*nightK);stars.material.opacity=0.9*nightK;stars.visible=nightK>0.02;
  const so=clamp((-climVis-0.15)/0.6,0,0.9);snow.material.opacity=so;snow.visible=so>0.02;
  if(snow.visible){
    const a=snowGeo.attributes.position.array;
    for(let i=0;i<snowN;i++){a[i*3+1]-=rdt*(3+(i%5));a[i*3]+=Math.sin(T*0.8+i)*rdt*0.8;if(a[i*3+1]<0)a[i*3+1]=45;}
    snowGeo.attributes.position.needsUpdate=true;
  }
  rain.visible=World.rain>0;
  if(rain.visible){const a=rainGeo.attributes.position.array;for(let i=0;i<600;i++){a[i*3+1]-=rdt*28;if(a[i*3+1]<0)a[i*3+1]=45;}rainGeo.attributes.position.needsUpdate=true;}
}

// Partículas (comer, nascer, morrer) e meteoro da extinção
const NP=240,pPos=new Float32Array(NP*3),pCol=new Float32Array(NP*3),pVel=new Float32Array(NP*3),pLife=new Float32Array(NP);let pI=0;
for(let i=0;i<NP;i++)pPos[i*3+1]=-50;
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:0.5,vertexColors:true,transparent:true,opacity:.95,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);
const FXC=[[1,0.36,0.45],[1,0.85,0.3],[0.6,0.65,0.78]];
function burst(x,z,t){for(let k=0;k<(t===1?10:6);k++){const i=pI++%NP,a=Math.random()*6.28,sp=1.5+Math.random()*2.5,c=FXC[t];pPos[i*3]=x;pPos[i*3+1]=0.8;pPos[i*3+2]=z;pVel[i*3]=Math.cos(a)*sp;pVel[i*3+1]=2+Math.random()*3;pVel[i*3+2]=Math.sin(a)*sp;pLife[i]=1;pCol[i*3]=c[0];pCol[i*3+1]=c[1];pCol[i*3+2]=c[2];}}
function updateFx(rdt){
  let n=0;while(World.fx.length){const f=World.fx.pop();if(n++<50)burst(f[0],f[1],f[2]);if(f[2]===0&&simSpeed<=3)Som.comer();else if(f[2]===1)Som.nascer();}
  for(let i=0;i<NP;i++){
    if(pLife[i]>0){pLife[i]-=rdt*1.3;pVel[i*3+1]-=9*rdt;pPos[i*3]+=pVel[i*3]*rdt;pPos[i*3+1]+=pVel[i*3+1]*rdt;pPos[i*3+2]+=pVel[i*3+2]*rdt;if(pPos[i*3+1]<0){pPos[i*3+1]=0;pVel[i*3+1]*=-0.3;}}
    else pPos[i*3+1]=-50;
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
}
const meteor=new THREE.Mesh(new THREE.SphereGeometry(1.6,16,12),new THREE.MeshBasicMaterial({color:0xffb347}));meteor.visible=false;scene.add(meteor);
const flash=new THREE.Mesh(new THREE.RingGeometry(0.6,1,48),new THREE.MeshBasicMaterial({color:0xfff2cc,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));flash.rotation.x=-Math.PI/2;flash.position.y=0.3;scene.add(flash);
let metT=-1,shake=0;
function updateMeteor(rdt){
  shake*=0.92;if(metT<0){flash.material.opacity=0;meteor.visible=false;return;}
  metT+=rdt;
  if(metT<1.2){const k=metT/1.2;meteor.visible=true;meteor.position.set(-70*(1-k),95*(1-k)*(1-k)+2,-45*(1-k));meteor.scale.setScalar(1+k);}
  else{meteor.visible=false;const k=(metT-1.2)/1.1;flash.scale.setScalar(2+k*75);flash.material.opacity=Math.max(0,0.9*(1-k));shake=Math.max(shake,1-k);if(k>=1)metT=-1;}
}

// Criaturas (blobs de gelatina): corpo, olhos e pupilas em instâncias
const MAXI=MAXPOP+40;
const bodies=new THREE.InstancedMesh(new THREE.SphereGeometry(1,28,20),new THREE.MeshStandardMaterial({roughness:.3,metalness:0}),MAXI);
bodies.castShadow=true;bodies.frustumCulled=false;bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);bodies.setColorAt(0,new THREE.Color(1,1,1));
const eyes=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.25}),MAXI*2);
const pupils=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:0x1b1b2f,roughness:.2}),MAXI*2);
for(const m of [eyes,pupils]){m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);}
scene.add(bodies,eyes,pupils);
const mkInst=(g,mat,cnt,sh)=>{const m=new THREE.InstancedMesh(g,mat,cnt);m.frustumCulled=false;m.castShadow=!!sh;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.setColorAt(0,new THREE.Color(1,1,1));scene.add(m);return m;};
const feet=mkInst(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({roughness:.5}),MAXI*2);
const ears=mkInst(new THREE.ConeGeometry(0.26,0.7,8).translate(0,0.35,0),new THREE.MeshStandardMaterial({roughness:.45}),MAXI*2,1);
const stalks=mkInst(new THREE.CylinderGeometry(0.06,0.06,1,6).translate(0,0.5,0),new THREE.MeshStandardMaterial({roughness:.5}),MAXI);
const bulbs=mkInst(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({roughness:.3}),MAXI);
const leaves=new THREE.InstancedMesh(new THREE.ConeGeometry(0.14,0.34,5).translate(0,0.17,0),new THREE.MeshStandardMaterial({color:0x4caf50,roughness:.8,flatShading:true}),200);
leaves.frustumCulled=false;leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(leaves);
const tmpC2=new THREE.Color(),WHITE=new THREE.Color(1,1,1);

const foodMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5,0),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x333333,emissiveIntensity:.4,roughness:.4,flatShading:true}),200);
const FRC=[new THREE.Color(0x7c6cf0),new THREE.Color(0xff5d73),new THREE.Color(0xffc933)];
foodMesh.setColorAt(0,new THREE.Color(1,1,1));foodMesh.castShadow=true;foodMesh.frustumCulled=false;foodMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(foodMesh);

const selRing=new THREE.Mesh(new THREE.RingGeometry(1,1.18,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false}));
const senseDisc=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
for(const m of [selRing,senseDisc]){m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);}

const dyn=new Set([bodies,eyes,pupils,feet,ears,stalks,bulbs,foodMesh,leaves]);
function applyTerrain(){
  const pa=ground.geometry.attributes.position,a=pa.array;
  for(let i=0;i<pa.count;i++)a[i*3+2]=H(a[i*3],-a[i*3+1]);
  let ca=ground.geometry.attributes.color;
  if(!ca){ca=new THREE.BufferAttribute(new Float32Array(pa.count*3),3);ground.geometry.setAttribute('color',ca);ground.material.vertexColors=true;ground.material.needsUpdate=true;}
  for(let i=0;i<pa.count;i++){
    const h=a[i*3+2];let r=1,g=1,b=1;
    if(h>1.2){const t=Math.min(1,(h-1.2)/0.8);r=1+0.12*t;g=1-0.28*t;b=1+0.32*t;}
    if(h>2.3){const t=Math.min(1,(h-2.3)/0.7);r+=(1.75-r)*t;g+=(1.18-g)*t;b+=(2.4-b)*t;}
    if(h<-0.2){const t=Math.min(1,(-h-0.2)/0.8);r=1-0.2*t;g=1-0.03*t;b=1+0.05*t;}
    ca.array[i*3]=r;ca.array[i*3+1]=g;ca.array[i*3+2]=b;
  }
  ca.needsUpdate=true;
  pa.needsUpdate=true;ground.geometry.computeVertexNormals();
  scene.traverse(o=>{
    if(!o.isInstancedMesh||dyn.has(o))return;
    const m=o.instanceMatrix.array,b=o.userData.base||(o.userData.base=m.slice());
    for(let i=0;i<o.count;i++)m[i*16+13]=b[i*16+13]+H(b[i*16+12],b[i*16+14]);
    o.instanceMatrix.needsUpdate=true;
  });
}
let editT=false,modeDown=false;const undoS=[];
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3(),ndc=new THREE.Vector2();
function paint(px,py,sh){
  ndc.set(px/innerWidth*2-1,-(py/innerHeight)*2+1);ray.setFromCamera(ndc,camera);
  if(!ray.ray.intersectPlane(plane,hit))return;
  $('terr').value='custom';
  const dir=(sh||modeDown)?-1:1,BR=5;
  for(let iz=0;iz<=GN;iz++)for(let ix=0;ix<=GN;ix++){
    const x=-R-1+ix*GS-hit.x,z=-R-1+iz*GS-hit.z,d=Math.hypot(x,z);
    if(d<BR){const k=1-d/BR,i=iz*(GN+1)+ix;HG[i]=clamp(HG[i]+dir*0.22*k*k,FLOOR,3.6);}
  }
  applyTerrain();terrEdited=true;
}
const GREY=new THREE.Color(0x9aa3b5),dummy2=new THREE.Object3D();dummy2.rotation.order='YXZ';
let T=0;
function updateScene(rdt){
  const cs=World.creatures,n=Math.min(cs.length,MAXI);
  for(let i=0;i<n;i++){
    const c=cs[i];
    if(!c.col){c.col=new THREE.Color(SPC[c.sp].hex);c.col.offsetHSL((Math.random()-.5)*0.03,0,(c.speed-1)*0.04-(c.size-1)*0.02-c.temp*0.07);}
    const tv=c.state==='dead'?0:1;c.vis+=(tv-c.vis)*Math.min(1,rdt*(tv?4:7));
    const rb=0.7*c.size*c.vis,out=c.state==='out';
    const wob=Math.sin(T*(3+c.speed*3)+c.id)*(out?0.08:0.03);
    dummy.rotation.set(0,0,0);dummy.position.set(c.x,rb*0.9,c.z);
    dummy.scale.set(rb*(1-wob*0.6),rb*0.9*(1+wob),rb*(1-wob*0.6));dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
    tmpC.copy(c.col);if(c.state==='dead')tmpC.lerp(GREY,0.75);bodies.setColorAt(i,tmpC);
    const fx=Math.cos(c.heading),fz=Math.sin(c.heading),sx=-fz,sz=fx;
    const er=Math.min(rb*0.42,rb*(0.17+0.055*c.sense)),bl=Math.sin(T*0.9+c.id*7.3)>0.992?0.15:1;dummy2.rotation.set(0,0,0);
    for(let s=0;s<2;s++){
      const sg=s?1:-1,ex=c.x+fx*rb*0.64+sx*sg*rb*0.36,ey=rb*0.9+rb*0.3,ez=c.z+fz*rb*0.64+sz*sg*rb*0.36;
      dummy2.position.set(ex,ey,ez);dummy2.scale.set(er,er*bl,er);dummy2.updateMatrix();eyes.setMatrixAt(i*2+s,dummy2.matrix);
      dummy2.position.set(ex+fx*er*0.5,ey,ez+fz*er*0.5);dummy2.scale.setScalar(er*0.55);dummy2.updateMatrix();pupils.setMatrixAt(i*2+s,dummy2.matrix);
    }
    const walk=out?T*(6+c.speed*4)+c.id:0,amp=out?0.28:0.05,azul=c.sp===0;
    for(let s=0;s<2;s++){
      const sg=s?1:-1,fo=Math.sin(walk+s*3.14)*amp*rb,so=sg*rb*0.36;
      dummy2.position.set(c.x+fx*fo+sx*so,rb*0.13,c.z+fz*fo+sz*so);dummy2.rotation.set(0,-c.heading,0);dummy2.scale.set(rb*0.3,rb*0.13,rb*0.22);dummy2.updateMatrix();
      feet.setMatrixAt(i*2+s,dummy2.matrix);feet.setColorAt(i*2+s,tmpC2.copy(tmpC).multiplyScalar(0.72));
      dummy2.position.set(c.x+sx*sg*rb*0.46,rb*1.5,c.z+sz*sg*rb*0.46);dummy2.rotation.set(sg*0.5,-c.heading,0);dummy2.scale.setScalar(azul?0:rb);dummy2.updateMatrix();
      ears.setMatrixAt(i*2+s,dummy2.matrix);ears.setColorAt(i*2+s,tmpC2.copy(tmpC).lerp(WHITE,0.25));
    }
    dummy2.rotation.set(0,0,0);
    dummy2.position.set(c.x,rb*1.7,c.z);dummy2.scale.set(rb,azul?rb*0.6:0,rb);dummy2.updateMatrix();
    stalks.setMatrixAt(i,dummy2.matrix);stalks.setColorAt(i,tmpC2.copy(tmpC).multiplyScalar(0.8));
    dummy2.position.set(c.x,rb*2.3,c.z);dummy2.scale.setScalar(azul?rb*0.2*(1+0.15*Math.sin(T*4+c.id)):0);dummy2.updateMatrix();
    bulbs.setMatrixAt(i,dummy2.matrix);bulbs.setColorAt(i,tmpC2.copy(tmpC).lerp(WHITE,0.5));
  }
  bodies.count=n;eyes.count=n*2;pupils.count=n*2;feet.count=n*2;ears.count=n*2;stalks.count=n;bulbs.count=n;
  for(let i=0;i<n;i++){
    const c=cs[i],gy=H(c.x,c.z);c.gy=gy;
    bodies.instanceMatrix.array[i*16+13]+=gy;stalks.instanceMatrix.array[i*16+13]+=gy;bulbs.instanceMatrix.array[i*16+13]+=gy;
    for(let s=0;s<2;s++){const j=(i*2+s)*16+13;eyes.instanceMatrix.array[j]+=gy;pupils.instanceMatrix.array[j]+=gy;feet.instanceMatrix.array[j]+=gy;ears.instanceMatrix.array[j]+=gy;}
  }
  for(const m of [feet,ears,stalks,bulbs]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  bodies.instanceMatrix.needsUpdate=eyes.instanceMatrix.needsUpdate=pupils.instanceMatrix.needsUpdate=true;
  if(bodies.instanceColor)bodies.instanceColor.needsUpdate=true;

  const fs=World.foods,fn=Math.min(fs.length,200),dusk=World.phase==='dusk';
  for(let i=0;i<fn;i++){
    const f=fs[i],tv=(f.alive&&!dusk)?1:0;f.vis+=(tv-f.vis)*Math.min(1,rdt*(tv?3:10));
    dummy2.rotation.set(0,T*0.6+f.ph,0);dummy2.position.set(f.x,0.6+Math.sin(T*2+f.ph)*0.1,f.z);dummy2.scale.setScalar(f.vis*0.9);dummy2.updateMatrix();
    foodMesh.setMatrixAt(i,dummy2.matrix);
    dummy2.rotation.set(0,0,0);dummy2.position.y+=0.4*f.vis;dummy2.updateMatrix();leaves.setMatrixAt(i,dummy2.matrix);
  }
  dummy2.rotation.set(0,0,0);
  for(let i=0;i<fn;i++){const gy=H(fs[i].x,fs[i].z);foodMesh.instanceMatrix.array[i*16+13]+=gy;leaves.instanceMatrix.array[i*16+13]+=gy;foodMesh.setColorAt(i,FRC[fs[i].k]);}
  foodMesh.count=fn;foodMesh.instanceMatrix.needsUpdate=true;if(foodMesh.instanceColor)foodMesh.instanceColor.needsUpdate=true;leaves.count=fn;leaves.instanceMatrix.needsUpdate=true;

  foam.material.opacity=0.28+0.14*Math.sin(T*1.1);foam.scale.setScalar(1+0.012*Math.sin(T*0.9));
  water.position.y=SEA_Y+0.04*Math.sin(T*0.7);
  Entorno.atualizar(rdt);
  applyClimate(rdt);updateFx(rdt);updateMeteor(rdt);updateLake(rdt);
}
