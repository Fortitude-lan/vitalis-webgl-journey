const round=(value,places=4)=>Number(value.toFixed(places));
const vector=source=>source.toArray().map(value=>round(value));

export function createKelpCameraRecorder(camera,controls){
  let points=[];
  let recording=false;
  let elapsed=0;
  let startedAt=0;

  const panel=document.createElement('aside');
  panel.className='kelp-recorder';
  panel.setAttribute('aria-label','Kelp camera path recorder');
  panel.innerHTML=`
    <div class="kelp-recorder__header">
      <strong>CAMERA PATH RECORDER</strong>
      <button type="button" data-action="hide" aria-label="Hide recorder">H</button>
    </div>
    <div class="kelp-recorder__status" data-role="status">PAUSED · 0 SHOTS · 0.00S</div>
    <div class="kelp-recorder__coords" data-role="coords"></div>
    <div class="kelp-recorder__actions">
      <button type="button" data-action="record">R · RECORD</button>
      <button type="button" data-action="capture">SPACE · CAPTURE</button>
      <button type="button" data-action="undo">BACKSPACE · UNDO</button>
      <button type="button" data-action="export">ENTER · EXPORT JSON</button>
    </div>
    <p>左键旋转 · 右键平移 · 滚轮穿行 · Shift 加速 · Ctrl 精细 · [ / ] 调整 FOV · Shift+C 清空</p>`;
  document.body.appendChild(panel);

  const status=panel.querySelector('[data-role="status"]');
  const coords=panel.querySelector('[data-role="coords"]');
  const recordButton=panel.querySelector('[data-action="record"]');
  const time=()=>elapsed+(recording?(performance.now()-startedAt)/1000:0);

  function refresh(){
    const seconds=time();
    panel.dataset.recording=String(recording);
    status.textContent=`${recording?'RECORDING':'PAUSED'} · ${points.length} SHOT${points.length===1?'':'S'} · ${seconds.toFixed(2)}S`;
    recordButton.textContent=recording?'R · PAUSE':'R · RECORD';
    coords.textContent=`EYE  ${vector(camera.position).join(', ')}\nLOOK ${vector(controls.target).join(', ')}\nFOV  ${round(camera.fov,1)}°`;
  }

  function toggle(){
    if(recording){
      elapsed=time();
      recording=false;
    }else{
      startedAt=performance.now();
      recording=true;
    }
    refresh();
  }

  function capture(){
    const point={
      id:`shot-${String(points.length+1).padStart(2,'0')}`,
      time:round(time(),3),
      position:vector(camera.position),
      target:vector(controls.target),
      fov:round(camera.fov,1)
    };
    points.push(point);
    console.info('[Kelp camera] captured',point);
    refresh();
    return point;
  }

  function undo(){
    const removed=points.pop();
    if(removed)console.info('[Kelp camera] removed',removed);
    refresh();
  }

  function clear(){
    points=[];
    elapsed=0;
    if(recording)startedAt=performance.now();
    console.info('[Kelp camera] path cleared');
    refresh();
  }

  function json(){
    const first=points[0]?.time??0;
    const last=points.at(-1)?.time??first;
    const duration=Math.max(0,last-first);
    return {
      name:'Ocean Journey Recorded',
      closed:false,
      duration:round(duration,3),
      points:points.map(point=>({
        ...point,
        time:round(point.time-first,3),
        progress:duration?round((point.time-first)/duration,5):0
      }))
    };
  }

  function exportJSON(){
    if(!points.length){
      console.warn('[Kelp camera] capture at least one shot before exporting');
      return null;
    }
    const data=json();
    const blob=new Blob([`${JSON.stringify(data,null,2)}\n`],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='ocean-camera-path-recorded.json';
    link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    console.info('[Kelp camera] exported',data);
    return data;
  }

  function adjustFov(amount){
    camera.fov=Math.max(28,Math.min(90,camera.fov+amount));
    camera.updateProjectionMatrix();
    refresh();
  }

  function onKey(event){
    if(event.repeat||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName))return;
    if(event.code==='KeyH')panel.hidden=!panel.hidden;
    else if(event.code==='KeyR')toggle();
    else if(event.code==='Space'){event.preventDefault();capture();}
    else if(event.code==='Enter')exportJSON();
    else if(event.code==='Backspace'||event.code==='Delete'){event.preventDefault();undo();}
    else if(event.code==='BracketLeft')adjustFov(-1);
    else if(event.code==='BracketRight')adjustFov(1);
    else if(event.code==='KeyC'&&event.shiftKey)clear();
  }

  panel.querySelector('[data-action="hide"]').addEventListener('click',()=>{panel.hidden=true;});
  panel.querySelector('[data-action="record"]').addEventListener('click',toggle);
  panel.querySelector('[data-action="capture"]').addEventListener('click',capture);
  panel.querySelector('[data-action="undo"]').addEventListener('click',undo);
  panel.querySelector('[data-action="export"]').addEventListener('click',exportJSON);
  window.addEventListener('keydown',onKey);
  refresh();

  const api={toggle,capture,undo,clear,json,exportJSON,refresh,get points(){return points.map(point=>({...point}));}};
  window.__kelpCameraRecorder=api;
  return {
    ...api,
    destroy(){
      window.removeEventListener('keydown',onKey);
      panel.remove();
      if(window.__kelpCameraRecorder===api)delete window.__kelpCameraRecorder;
    }
  };
}
