import * as THREE from 'three/webgpu';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountOriginalKelp } from './kelp17-mount.jsx';
import { CAMERA_PATH_CAPTURE } from './experience-config.js';
import './style.css';

gsap.registerPlugin(ScrollTrigger);
document.body.classList.toggle('kelp-only',CAMERA_PATH_CAPTURE);
window.__kelpScrollProgress=0;
const readyLayers={kelp:false,product:false};
window.__markVitalLayerReady=layer=>{
  readyLayers[layer]=true;
  if(!readyLayers.kelp||(!CAMERA_PATH_CAPTURE&&!readyLayers.product))return;
  window.__setVitalProgress?.(100,'READY TO DIVE');
  clearInterval(window.__vitalLoaderTimer);
  document.body.classList.add('is-ready');
  window.dispatchEvent(new CustomEvent('vital-ready'));
};
window.__setVitalProgress?.(78, 'BUILDING THE UNDERWATER WORLD');
const kelpRoot=document.querySelector('#kelp-root');
mountOriginalKelp(kelpRoot);
kelpRoot?.classList.add('is-active');

const canvas = document.querySelector('#world');
const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0.2, 2.1, 15.5);

const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha:true, forceWebGL: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000,0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 800 ? 1.25 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const hemi = new THREE.HemisphereLight(0x86d7d4, 0x061112, 1.45);
scene.add(hemi);
const sun = new THREE.SpotLight(0xc7fff2, 115, 48, Math.PI / 9, 0.82, 1.2);
sun.position.set(-7, 13, 8);
sun.target.position.set(0, -3, -5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun, sun.target);
// A soft spot keeps the warm product key without RectAreaLight's LTC lookup
// textures, which are not available in every WebGL2 node-renderer backend.
const productKey = new THREE.SpotLight(0xffe7c4, 62, 24, Math.PI / 5.5, 0.9, 1.35);
productKey.position.set(4, 5, 7);
productKey.target.position.set(0, 0, 0);
scene.add(productKey, productKey.target);
const deepFill = new THREE.PointLight(0x1c8d91, 16, 18, 2);
deepFill.position.set(-5, -4, 1);
scene.add(deepFill);

function noiseTexture(size = 512) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const grain = 116 + Math.random() * 28;
    data[i * 4] = grain; data[i * 4 + 1] = grain; data[i * 4 + 2] = grain; data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  texture.needsUpdate = true;
  return texture;
}

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#e8e2d4'; x.fillRect(0, 0, c.width, c.height);
  const grain = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    grain.data[i] += n; grain.data[i + 1] += n; grain.data[i + 2] += n;
  }
  x.putImageData(grain, 0, 0);
  x.textAlign = 'center'; x.fillStyle = '#123a35';
  x.font = '600 66px Arial'; x.fillText('V I T A L', 1024, 245);
  x.fillRect(720, 292, 608, 3);
  x.font = 'italic 112px Georgia'; x.fillText('Marine', 1024, 485);
  x.font = '500 32px Arial'; x.fillText('BOTANICAL COMPLEX', 1024, 572);
  x.font = '24px Arial'; x.fillText('SEA MINERALS  ·  BOTANICALS  ·  60 CAPSULES', 1024, 685);
  x.beginPath(); x.arc(1024, 815, 45, 0, Math.PI * 2);
  x.strokeStyle = '#8b764c'; x.lineWidth = 3; x.stroke();
  x.font = '600 20px Arial'; x.fillStyle = '#806d47'; x.fillText('01', 1024, 823);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  // WebGPURenderer does not expose WebGLRenderer.capabilities during module setup.
  // Four samples are a conservative cross-device value and require no early GPU query.
  texture.anisotropy = 4;
  return texture;
}

// A continuous lathed profile creates a manufactured silhouette with clean cylindrical UVs.
const productRig = new THREE.Group();
productRig.position.set(2.5, -0.2, 0);
scene.add(productRig);
const product = new THREE.Group();
productRig.add(product);
const bottleProfile = [[0,-2.25],[0.79,-2.25],[0.91,-2.18],[0.95,-2.02],[0.96,1.08],[0.92,1.28],[0.78,1.47],[0.64,1.58],[0.61,1.78],[0,1.78]].map(([x,y]) => new THREE.Vector2(x,y));
const glassRoughness = noiseTexture(256);
const bottleMat = new THREE.MeshPhysicalMaterial({ color:'#0e4a43', roughness:0.19, metalness:0.02, clearcoat:1, clearcoatRoughness:0.12, transmission:0.06, thickness:1.8, roughnessMap:glassRoughness, envMapIntensity:1.25 });
const bottle = new THREE.Mesh(new THREE.LatheGeometry(bottleProfile, 128), bottleMat);
bottle.castShadow = true; bottle.receiveShadow = true; product.add(bottle);
const paper = new THREE.MeshStandardMaterial({ map:labelTexture(), roughness:0.88, bumpMap:glassRoughness, bumpScale:0.018 });
const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.968,0.968,2.18,128,1,true), paper);
sleeve.position.y = -0.42; sleeve.rotation.y = -Math.PI / 2; sleeve.castShadow = true; product.add(sleeve);
const labelEdge = new THREE.MeshStandardMaterial({ color:'#a9905a', metalness:0.58, roughness:0.3 });
for (const y of [-1.52,0.68]) {
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.969,0.014,12,128), labelEdge);
  band.rotation.x = Math.PI / 2; band.position.y = y; product.add(band);
}
const capMat = new THREE.MeshPhysicalMaterial({ color:'#d8c08b', metalness:0.82, roughness:0.26, clearcoat:0.32 });
const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.72,0.72,128), capMat);
cap.position.y = 2.03; cap.castShadow = true; product.add(cap);
for (let i = 0; i < 56; i++) {
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.018,0.54,0.028), capMat);
  const a = i / 56 * Math.PI * 2;
  ridge.position.set(Math.sin(a) * 0.723, 2.03, Math.cos(a) * 0.723); ridge.rotation.y = a; product.add(ridge);
}
const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.68,0.68,0.025,96), new THREE.MeshStandardMaterial({ color:'#cbb37f', metalness:0.9, roughness:0.2 }));
capTop.position.y = 2.402; product.add(capTop);

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollScrub=reducedMotion?true:1.35;
const state = { progress:0,oceanProgress:0,oceanActive:false };
const panels = gsap.utils.toArray('.panel-inner');
gsap.set(panels.slice(1),{ autoAlpha:0,y:60 });
let journey;
journey = gsap.timeline({
  defaults:{ease:'none'},
  onUpdate:()=>{
    state.progress=journey.progress();
  },
  scrollTrigger:{trigger:'#journey',start:'top top',end:'bottom bottom',scrub:scrollScrub}
});
journey.to(camera.position,{x:-1.2,y:.3,z:9.2,duration:1},0).to(productRig.position,{x:2.4,y:-.5,z:-1.4,duration:1},0).to(productRig.rotation,{y:Math.PI*.62,z:-.08,duration:1},0)
  .to(panels[0],{autoAlpha:0,y:-55,duration:.22},.47).to(panels[1],{autoAlpha:1,y:0,duration:.24},.62)
  .to(camera.position,{x:2.5,y:-1.4,z:3.8,duration:1},1).to(productRig.position,{x:-2.8,y:-1.5,z:-3.4,duration:1},1).to(productRig.rotation,{y:Math.PI*1.46,z:.13,duration:1},1).to(sun,{intensity:76,duration:1},1).to(hemi,{intensity:.82,duration:1},1)
  .to(panels[1],{autoAlpha:0,y:-55,duration:.22},1.45).to(panels[2],{autoAlpha:1,y:0,duration:.24},1.60)
  .to(camera.position,{x:-1.1,y:-3,z:-7.5,duration:1},2).to(productRig.position,{x:2.2,y:-2.5,z:-11,duration:1},2).to(productRig.rotation,{y:Math.PI*2.15,z:-.18,duration:1},2).to(deepFill,{intensity:28,duration:1},2)
  .to(panels[2],{autoAlpha:0,y:-55,duration:.22},2.43).to(panels[3],{autoAlpha:1,y:0,duration:.24},2.60);

const oceanCards=gsap.utils.toArray('.ocean-copy');
gsap.set(oceanCards,{autoAlpha:0,y:36});
let oceanCardIndex=-1;
const setOceanCard=progress=>{
  const next=Math.min(oceanCards.length-1,Math.floor(progress*oceanCards.length));
  if(next===oceanCardIndex)return;
  oceanCards.forEach((card,index)=>gsap.to(card,{autoAlpha:index===next?1:0,y:index===next?0:-24,duration:reducedMotion?0:.45,overwrite:true}));
  oceanCardIndex=next;
};
const oceanPlayback={progress:0};
window.__kelpScrollTarget=0;
const applyOceanProgress=()=>{
  const progress=THREE.MathUtils.clamp(oceanPlayback.progress,0,1);
  window.__kelpScrollProgress=progress;
  state.oceanProgress=progress;
  gsap.set(canvas,{opacity:1-THREE.MathUtils.clamp(progress*12,0,1)});
  // Before the Ocean trigger is reached, the main journey timeline exclusively
  // owns this panel. This prevents a restored mid-page scroll position from
  // being overwritten by Ocean's initial progress of zero during refresh.
  if(state.oceanActive||window.__kelpScrollTarget>0||progress>0){
    gsap.set(panels[3],{autoAlpha:1-THREE.MathUtils.clamp(progress*12,0,1)});
  }
  if(state.oceanActive||progress>.0005)setOceanCard(progress);
  else if(oceanCardIndex!==-1){
    oceanCardIndex=-1;
    gsap.set(oceanCards,{autoAlpha:0,y:36});
  }
};
const oceanTween=gsap.to(oceanPlayback,{
  progress:1,
  ease:'none',
  onUpdate:applyOceanProgress,
  scrollTrigger:{
  trigger:'#ocean-journey',start:'top top',end:'+=500%',pin:true,scrub:scrollScrub,anticipatePin:1,
  onEnter:()=>{state.oceanActive=true;},onEnterBack:()=>{state.oceanActive=true;},
  onLeave:()=>{state.oceanActive=false;},
  onLeaveBack:()=>{state.oceanActive=false;},
  onUpdate:self=>{state.oceanActive=self.isActive;window.__kelpScrollTarget=self.progress;},
  onScrubComplete:self=>{
    // Land exactly on the ScrollTrigger target after the inertial glide.
    oceanPlayback.progress=THREE.MathUtils.clamp(self.progress,0,1);
    applyOceanProgress();
  }
}});
gsap.fromTo('.ending-inner',{autoAlpha:0,y:70},{autoAlpha:1,y:0,ease:'power3.out',scrollTrigger:{trigger:'#ending',start:'top 72%',end:'top 28%',scrub:true}});

// UI-only full-page progress. It reads the final document scroll range after
// ScrollTrigger has inserted its pin spacing and never writes to scene motion.
const storyProgress=document.querySelector('.story-progress');
const storyProgressValue=storyProgress.querySelector('.story-progress__value');
const storyProgressChapters=[...storyProgress.querySelectorAll('.story-progress__chapter')];
const storyProgressState={target:0,current:0,initialized:false,active:-1,stops:[0,0,1]};
const renderStoryProgress=()=>{
  const progress=THREE.MathUtils.clamp(storyProgressState.current,0,1);
  storyProgress.style.setProperty('--story-progress',progress.toFixed(5));
  storyProgressValue.value=`${String(Math.round(progress*100)).padStart(2,'0')}%`;
  storyProgress.setAttribute('aria-valuenow',String(Math.round(progress*100)));
  let active=0;
  storyProgressState.stops.forEach((stop,index)=>{if(progress>=stop-.001)active=index;});
  if(active!==storyProgressState.active){
    storyProgressState.active=active;
    storyProgressChapters.forEach((chapter,index)=>chapter.classList.toggle('is-active',index===active));
  }
};
const refreshStoryProgressStops=()=>{
  const maxScroll=Math.max(1,ScrollTrigger.maxScroll(window));
  const ending=document.querySelector('#ending');
  const endingTop=ending.getBoundingClientRect().top+window.scrollY;
  storyProgressState.stops=[
    0,
    THREE.MathUtils.clamp(oceanTween.scrollTrigger.start/maxScroll,0,1),
    THREE.MathUtils.clamp(endingTop/maxScroll,0,1)
  ];
  storyProgressChapters.forEach((chapter,index)=>chapter.style.setProperty('--chapter-progress',storyProgressState.stops[index].toFixed(5)));
  renderStoryProgress();
};
ScrollTrigger.create({
  id:'story-progress-ui',
  start:0,
  end:()=>ScrollTrigger.maxScroll(window),
  invalidateOnRefresh:true,
  onUpdate:self=>{
    storyProgressState.target=self.progress;
    if(!storyProgressState.initialized){
      storyProgressState.current=self.progress;
      storyProgressState.initialized=true;
      renderStoryProgress();
    }
  },
  onRefresh:self=>{
    storyProgressState.target=self.progress;
    if(!storyProgressState.initialized){
      storyProgressState.current=self.progress;
      storyProgressState.initialized=true;
    }
    refreshStoryProgressStops();
  }
});
gsap.ticker.add(()=>{
  if(!storyProgressState.initialized)return;
  if(reducedMotion)storyProgressState.current=storyProgressState.target;
  else{
    const deltaSeconds=Math.min(.064,gsap.ticker.deltaRatio(60)/60);
    const damping=1-Math.exp(-10*deltaSeconds);
    storyProgressState.current+= (storyProgressState.target-storyProgressState.current)*damping;
    if(Math.abs(storyProgressState.target-storyProgressState.current)<.00005)storyProgressState.current=storyProgressState.target;
  }
  renderStoryProgress();
});

const clock = new THREE.Clock();
async function animate() {
  const elapsed=clock.getElapsedTime(); product.position.y=Math.sin(elapsed*.48)*.11;product.rotation.y+=.0011;product.rotation.x=Math.sin(elapsed*.25)*.018;
  camera.lookAt(new THREE.Vector3(0,-.6-state.progress*1.5,-2-state.progress*11));
  if(!state.oceanActive)await renderer.renderAsync(scene,camera);requestAnimationFrame(animate);
}
renderer.init().then(async()=>{
  window.__setVitalProgress?.(94,'RENDERING THE FIRST FRAME');
  await renderer.renderAsync(scene,camera);
  window.__setVitalProgress?.(96,'PREPARING THE EXPERIENCE');
  window.__markVitalLayerReady?.('product');
  window.setTimeout(()=>{
    requestAnimationFrame(animate);
  },320);
}).catch(error=>{console.error(error);clearInterval(window.__vitalLoaderTimer);document.querySelector('.loader-copy').textContent='WEBGL 2 IS REQUIRED';});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<800?48:34;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.75));renderer.setSize(innerWidth,innerHeight);ScrollTrigger.refresh();});
