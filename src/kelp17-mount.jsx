import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ForestScene } from './kelp17/forest';
import { Atmosphere } from './kelp17/atmosphere';
import { Backdrop, Light, Snow } from './kelp17/sea';
import { LOOKS } from './kelp17/versions';
import { ageStirs } from './kelp17/stir';
import { advance, aim, ease, motion, sea } from './kelp17/water';
import { Post, focusBlur, focusDistance } from './shared/engine/Post';
import { OceanCameraRig } from './OceanCameraRig.js';
import { createKelpCameraRecorder } from './KelpCameraRecorder.js';
import { CAMERA_PATH_CAPTURE } from './experience-config.js';
import oceanPath from './data/ocean-camera-path.json';

extend(THREE);

// Exact Day 17 LOOK after Stage merges it over DEFAULT_LOOK (aoReach stays 200).
const POST_LOOK={background:'#000000',exposure:1.05,bloom:.35,bloomThreshold:.75,gi:0,ao:.35,aoRadius:.3,aoReach:200,haze:0,vignette:.55,grain:.02};

function OceanRuntime(){
  const camera=useThree(state=>state.camera);
  const gl=useThree(state=>state.gl);
  const rig=useMemo(()=>new OceanCameraRig(camera,oceanPath),[camera]);
  const phase=useRef('live');
  const controlsRef=useRef(null);
  const recorderRef=useRef(null);
  useEffect(()=>{motion.strength=.3;aim(LOOKS.forest,true);},[]);
  useLayoutEffect(()=>{
    if(!CAMERA_PATH_CAPTURE)rig.setProgress(window.__kelpScrollProgress??0).apply();
  },[rig]);
  useEffect(()=>{
    if(!CAMERA_PATH_CAPTURE)return;
    const first=oceanPath.points[0];
    camera.position.fromArray(first.position);
    camera.fov=first.fov;
    camera.updateProjectionMatrix();
    const controls=new OrbitControls(camera,gl.domElement);
    controls.target.fromArray(first.target);
    controls.enableDamping=true;
    controls.dampingFactor=.065;
    controls.rotateSpeed=.55;
    controls.panSpeed=.65;
    // OrbitControls' dolly stops at its target. Path authoring needs to travel
    // through that point, so the wheel trucks both the eye and target instead.
    controls.enableZoom=false;
    controls.minDistance=.05;
    controls.maxDistance=200;
    controls.update();
    const forward=new THREE.Vector3();
    const onWheel=event=>{
      event.preventDefault();
      camera.getWorldDirection(forward);
      const speed=event.shiftKey ? 0.035 : event.ctrlKey ? 0.0025 : 0.012;
      const distance=THREE.MathUtils.clamp(-event.deltaY*speed,-8,8);
      camera.position.addScaledVector(forward,distance);
      controls.target.addScaledVector(forward,distance);
      controls.update();
      rig.target.copy(controls.target);
    };
    gl.domElement.addEventListener('wheel',onWheel,{passive:false});
    rig.target.copy(controls.target);
    controlsRef.current=controls;
    recorderRef.current=createKelpCameraRecorder(camera,controls);
    window.__kelpCameraControls=controls;
    return()=>{
      recorderRef.current?.destroy();
      recorderRef.current=null;
      gl.domElement.removeEventListener('wheel',onWheel);
      controls.dispose();
      controlsRef.current=null;
      if(window.__kelpCameraControls===controls)delete window.__kelpCameraControls;
    };
  },[camera,gl,rig]);
  useFrame((_,rawDelta)=>{
    const delta=Math.min(rawDelta,1/15);
    sea.clock.value+=delta;
    advance(delta);
    ease(1-Math.exp(-delta*2));
    ageStirs(delta);
    if(CAMERA_PATH_CAPTURE){
      controlsRef.current?.update();
      if(controlsRef.current)rig.target.copy(controlsRef.current.target);
      recorderRef.current?.refresh();
    }else{
      rig.setProgress(window.__kelpScrollProgress??0).apply();
    }
    const focus=Math.max(.6,camera.position.distanceTo(rig.target));
    focusDistance.value=focus;
    focusBlur.value=1.5*THREE.MathUtils.clamp(4/focus,.5,1.2);
  });
  return <>
    <Post look={POST_LOOK} quality="high" hasHaze={false} bounce={false} overlay depthOfField={{range:5}} phase={phase}/>
    <Backdrop/><Light/>
    <Snow count={9000}/><Snow silt count={12000}/>
    <Atmosphere motes={1500}/><Atmosphere rising motes={8000}/><Atmosphere rising far motes={20000}/>
    <Suspense fallback={null}><ForestScene active fine={1} startFine={1}/><KelpReady/></Suspense>
  </>;
}

function KelpReady(){
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      window.__markVitalLayerReady?.('kelp');
      window.dispatchEvent(new CustomEvent('kelp-ready'));
    });
    return()=>cancelAnimationFrame(frame);
  },[]);
  return null;
}

function KelpCanvas(){
  const first=oceanPath.points[0];
  return <Canvas
    shadows="percentage"
    dpr={[1,Math.min(devicePixelRatio,1.5)]}
    camera={{position:first.position,fov:first.fov,near:.05,far:400}}
    gl={async props=>{
      let renderer=new THREE.WebGPURenderer({...props,antialias:false,alpha:false});
      try{await renderer.init();}catch(error){console.warn('Kelp WebGPU fallback',error);renderer=new THREE.WebGPURenderer({...props,antialias:false,alpha:false,forceWebGL:true});await renderer.init();}
      return renderer;
    }}>
    <OceanRuntime/>
  </Canvas>;
}

export function mountOriginalKelp(element){
  if(!element)return()=>{};
  const root=createRoot(element);root.render(<KelpCanvas/>);return()=>root.unmount();
}
