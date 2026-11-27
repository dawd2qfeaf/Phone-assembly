import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const componentData = [
  { id:'frame', name:'Frame / Chassis', function:'The structural body that supports and aligns all internal parts.', instruction:'Place the chassis on the main assembly base.', targetId:'frame-slot', order:0, color:0x60758a, shape:'frame' },
  { id:'charging-port', name:'Charging Port', function:'Receives charging power and provides a wired data connection.', instruction:'Install the charging port at the bottom edge of the chassis.', targetId:'charging-slot', order:1, color:0x62c6ed, shape:'port' },
  { id:'speaker', name:'Speaker', function:'Converts electrical audio signals into sound.', instruction:'Place the speaker module in the lower internal bay.', targetId:'speaker-slot', order:2, color:0xd4a96b, shape:'speaker' },
  { id:'motherboard', name:'Motherboard', function:'Connects and coordinates the phone’s electronic components.', instruction:'Seat the motherboard in the central board area.', targetId:'board-slot', order:3, color:0x59a77e, shape:'board' },
  { id:'camera', name:'Camera Module', function:'Captures light and converts it into digital image data.', instruction:'Place the camera module in the upper camera bay.', targetId:'camera-slot', order:4, color:0x7b8fe0, shape:'camera' },
  { id:'battery', name:'Battery', function:'Stores energy and supplies power to the phone.', instruction:'Place the battery in the large central battery bay.', targetId:'battery-slot', order:5, color:0xc9d2dd, shape:'battery' },
  { id:'display', name:'Display', function:'Displays visual information and receives touch input.', instruction:'Install the display over the front side of the assembly.', targetId:'display-slot', order:6, color:0x3e9fc5, shape:'display' },
  { id:'back-cover', name:'Back Cover', function:'Protects internal parts and closes the phone body.', instruction:'Fit the back cover as the final assembly step.', targetId:'cover-slot', order:7, color:0x58626f, shape:'cover' }
];

const state = {
  currentStep:0,
  selectedComponentId:null,
  installedIds:new Set(),
  complete:false,
  poweredOn:false
};

const $ = (id)=>document.getElementById(id);
const componentById = (id)=>componentData.find(c=>c.id===id);
let scene, camera, renderer, raycaster, pointer, root, slotObjects = new Map(), partObjects = new Map(), objectToId = new Map(), targetToSlot = new Map();
let selectedOutline = null;
let animationFrame = null;

function init3D(){
  const host = $('scene');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111923);
  camera = new THREE.PerspectiveCamera(38,host.clientWidth/host.clientHeight,0.1,100);
  camera.position.set(7.5,9,12);
  camera.lookAt(0,0,0);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(host.clientWidth,host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x354052,2.2));
  const key = new THREE.DirectionalLight(0xffffff,2.3); key.position.set(5,8,6); scene.add(key);
  const grid = new THREE.GridHelper(16,16,0x324457,0x24313f); grid.position.y=-0.65; scene.add(grid);
  root = new THREE.Group(); scene.add(root);
  raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
  createWorkbench();
  renderer.domElement.addEventListener('pointerdown',onScenePointer);
  renderer.domElement.addEventListener('pointermove',onPointerMove);
  window.addEventListener('resize',resizeRenderer);
  animate();
}
function material(color,opacity=1,transparent=false){return new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.15,opacity,transparent});}
function addBox(parent,name,size,pos,color,opts={}){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),material(color,opts.opacity??1,opts.transparent??false));
  mesh.position.set(...pos); mesh.name=name; mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function addTarget(id,label,pos,size){
  const target = new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color:0x6bd4ff,transparent:true,opacity:.12,wireframe:true}));
  target.position.set(...pos); target.userData.targetId=id; target.userData.label=label; root.add(target);
  slotObjects.set(id,target); targetToSlot.set(target,id);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.075,12,12),material(0x6bd4ff));
  dot.position.set(pos[0],pos[1]+.12,pos[2]); dot.userData.targetId=id; root.add(dot); targetToSlot.set(dot,id);
}
function createWorkbench(){
  // A shallow tray and main chassis target area
  addBox(root,'workbench',[8.6,.25,6.2],[0,-.48,0],0x263342);
  addBox(root,'base-platform',[4.2,.14,5.1],[0,-.28,0],0x344455);
  addTarget('frame-slot','Frame / Chassis',[0,.05,0],[3.45,.14,4.55]);
  // component target zones, deliberately visible as outlines
  addTarget('charging-slot','Charging Port',[0,.12,2.02],[.65,.18,.3]);
  addTarget('speaker-slot','Speaker',[0,.12,1.55],[1.15,.18,.48]);
  addTarget('board-slot','Motherboard',[0,.12,.15],[2.65,.18,1.6]);
  addTarget('camera-slot','Camera Module',[-1.15,.12,-1.75],[.85,.18,.65]);
  addTarget('battery-slot','Battery',[.45,.12,-.55],[1.55,.18,1.65]);
  addTarget('display-slot','Display',[0,.18,0],[3.25,.12,4.35]);
  addTarget('cover-slot','Back Cover',[0,.2,0],[3.45,.12,4.55]);
  // loose parts displayed in a row to the right of phone
  componentData.forEach((c,i)=>{
    const x=4.2, z=2.7-i*.72;
    const mesh=createPartMesh(c);
    mesh.position.set(x,.25,z);
    mesh.userData.componentId=c.id;
    partObjects.set(c.id,mesh); objectToId.set(mesh,c.id);
    root.add(mesh);
  });
  addTextSprite('PARTS TRAY',[4.2,.95,0]);
  addTextSprite('ASSEMBLY TARGETS',[0,.9,-3.2]);
}
function createPartMesh(c){
  const group=new THREE.Group();
  const color=c.color;
  switch(c.shape){
    case 'frame':
      addBox(group,'frame-body',[2.75,.22,3.7],[0,0,0],color);
      // inset creates a visual rim (simplified)
      addBox(group,'frame-inset',[2.25,.25,3.1],[0,.02,0],0x293644);
      addBox(group,'frame-body-inner',[2.08,.27,2.95],[0,.03,0],color);
      break;
    case 'port': addBox(group,'port',[.55,.2,.28],[0,0,0],color); addBox(group,'port-opening',[.22,.22,.08],[0,.03,.1],0x17202a); break;
    case 'speaker': addBox(group,'speaker',[.9,.2,.4],[0,0,0],color); for(let j=-2;j<=2;j++) addBox(group,'speaker-hole',[.07,.22,.12],[j*.13,0,.04],0x17202a); break;
    case 'motherboard': addBox(group,'board',[2.15,.22,1.25],[0,0,0],color); addBox(group,'chip',[.65,.25,.55],[.3,.02,.05],0x263344); addBox(group,'chip2',[.4,.25,.35],[-.55,.02,-.25],0x263344); break;
    case 'camera': addBox(group,'camera-base',[.72,.2,.55],[0,0,0],color); const lens=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.2,20),material(0x111827)); lens.rotation.x=Math.PI/2; lens.position.set(-.15,.12,0); group.add(lens); break;
    case 'battery': addBox(group,'battery',[1.25,.18,1.35],[0,0,0],color); addBox(group,'battery-label',[.75,.2,.55],[0,.03,0],0x9ba9b8); break;
    case 'display': addBox(group,'display',[2.65,.12,3.55],[0,0,0],color); addBox(group,'screen-glass',[2.5,.14,3.4],[0,.02,0],0x102332); break;
    case 'cover': addBox(group,'cover',[2.75,.16,3.7],[0,0,0],color); addBox(group,'cover-camera-cutout',[.6,.18,.55],[-.9,0,-1.25],0x222b35); break;
  }
  group.userData.componentId=c.id;
  return group;
}
function addTextSprite(text,pos){
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128;
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#c4d5e5'; ctx.font='bold 32px Arial'; ctx.textAlign='center'; ctx.fillText(text,256,75);
  const tex=new THREE.CanvasTexture(canvas); const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  sprite.scale.set(3,0.75,1); sprite.position.set(...pos); root.add(sprite);
}
function animate(){animationFrame=requestAnimationFrame(animate); renderer.render(scene,camera);}
function resizeRenderer(){const host=$('scene'); if(!renderer)return; camera.aspect=host.clientWidth/host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth,host.clientHeight);}
function onScenePointer(e){
  const rect=renderer.domElement.getBoundingClientRect(); pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(root.children,true);
  for(const hit of hits){
    let obj=hit.object;
    while(obj && obj!==root){
      if(obj.userData.componentId){selectComponent(obj.userData.componentId);return;}
      if(obj.userData.targetId){attemptInstallAt(obj.userData.targetId);return;}
      obj=obj.parent;
    }
  }
}
function onPointerMove(e){
  const rect=renderer.domElement.getBoundingClientRect(); pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(root.children,true);
  renderer.domElement.style.cursor=hits.length?'pointer':'grab';
}
function selectComponent(id){
  const c=componentById(id); if(!c)return;
  state.selectedComponentId=id;
  renderUI();
  setFeedback(state.installedIds.has(id)?`${c.name} is already installed.`:`Selected ${c.name}. Now click its matching target in the 3D workbench.`,state.installedIds.has(id)?'error':'');
}
function attemptInstallAt(targetId){
  if(!state.selectedComponentId){setFeedback('Select a component first, then click an installation target.','error');return;}
  const c=componentById(state.selectedComponentId);
  if(state.installedIds.has(c.id)){setFeedback(`${c.name} is already installed. Select another component.`, 'error');return;}
  if(state.complete){setFeedback('Assembly is complete. Use Restart Assembly to begin again.','error');return;}
  const current=componentData[state.currentStep];
  if(c.order!==state.currentStep){setFeedback(`Wrong step. Current task: ${current.name}. Install components in the displayed sequence.`, 'error');return;}
  if(c.targetId!==targetId){setFeedback(`Incorrect target for ${c.name}. Try its highlighted target: ${c.targetId.replace('-slot','').replaceAll('-',' ')}.`, 'error');return;}
  // Validate component identity, intended target, and active sequence.
  state.installedIds.add(c.id);
  state.selectedComponentId=null;
  snapComponentToTarget(c);
  state.currentStep++;
  state.complete=state.installedIds.size===componentData.length;
  if(state.complete){setFeedback('Assembly Complete! All 8 components are installed. You can power on the phone.','success');}
  else setFeedback(`${c.name} installed successfully. Next: ${componentData[state.currentStep].name}.`,'success');
  renderUI();
}
function snapComponentToTarget(c){
  const obj=partObjects.get(c.id);
  const target=slotObjects.get(c.targetId);
  const p=target.position;
  // target positions are logical; keep loose parts visually separate before install
  obj.position.set(p.x,p.y+.24,p.z);
  obj.rotation.set(0,0,0);
  if(c.id==='frame'){obj.scale.set(1.15,1.05,1.15);}
  if(c.id==='display'){obj.position.y=p.y+.45;}
  if(c.id==='cover'){obj.position.y=p.y+.75;}
  obj.traverse(child=>{if(child.isMesh && child.material){child.material.color.setHex(c.color); child.material.transparent=false; child.material.opacity=1;}});
  obj.userData.installed=true;
  const targetMat=target.material; targetMat.color.set(0x72e0a4); targetMat.opacity=.08;
}
function setFeedback(message,type=''){const el=$('feedback');el.textContent=message;el.className='feedback'+(type?' '+type:'');}
function renderUI(){
  const installed=state.installedIds.size, progress=installed/componentData.length*100;
  $('progressCount').textContent=`${installed} / ${componentData.length}`;
  $('progressFill').style.width=`${progress}%`;
  $('progressPercent').textContent=`${progress}%`;
  $('progressStatus').textContent=state.complete?'Complete':'In progress';
  $('partsRemaining').textContent=`${componentData.length-installed} remaining`;
  $('assemblyBadge').textContent=state.complete?'ASSEMBLY COMPLETE':'ASSEMBLY IN PROGRESS';
  $('assemblyBadge').classList.toggle('complete',state.complete);
  $('powerBtn').disabled=!state.complete;
  $('stepTitle').textContent=state.complete?'Assembly Complete':`${state.currentStep+1}. ${stepNames[state.currentStep]}`;
  $('stepInstruction').textContent=state.complete?'All parts are installed. Press Power On to test the phone.':componentData[state.currentStep].instruction;
  renderComponentList();
  renderComponentInfo();
}
const stepNames=['Prepare Frame','Install Charging Port','Install Speaker','Install Motherboard','Install Camera Module','Install Battery','Install Display','Install Back Cover'];
function renderComponentList(){
  const list=$('componentList');list.innerHTML='';
  componentData.forEach((c,i)=>{
    const installed=state.installedIds.has(c.id),selected=state.selectedComponentId===c.id;
    const btn=document.createElement('button');btn.className='component-item'+(selected?' selected':'')+(installed?' installed':'');
    btn.innerHTML=`<span class="component-number">${String(i+1).padStart(2,'0')}</span><span class="component-name">${c.name}</span><span class="component-state ${installed?'done':''}">${installed?'✓ Installed':selected?'Selected':'Not installed'}</span>`;
    btn.disabled=installed;
    btn.addEventListener('click',()=>selectComponent(c.id));
    list.appendChild(btn);
  });
}
function renderComponentInfo(){
  const box=$('componentInfo');
  const c=componentById(state.selectedComponentId)||componentData[state.currentStep];
  if(!c){box.innerHTML='<p class="muted">Select a component to see details.</p>';return;}
  const status=state.installedIds.has(c.id)?'Installed':c.id===componentData[state.currentStep]?.id?'Current step':'Not installed';
  box.innerHTML=`<h3>${c.name}</h3><p>${c.function}</p><p><strong>Instruction:</strong> ${c.instruction}</p><p class="info-status"><strong>Status:</strong> ${status}</p>`;
}
function powerOn(){
  if(!state.complete)return;
  state.poweredOn=!state.poweredOn;
  const screenPart=partObjects.get('display');
  if(screenPart){
    screenPart.traverse(o=>{if(o.isMesh && o.name==='screen-glass')o.material.color.set(state.poweredOn?0x65d5ff:0x102332);});
  }
  $('powerBtn').textContent=state.poweredOn?'⏻ Power Off':'⏻ Power On';
  $('powerMessage').textContent=state.poweredOn?'Phone powered on successfully. The display is active.':'Phone is powered off.';
  setFeedback(state.poweredOn?'Phone is now powered on!':'Phone powered off.', 'success');
}
function restart(){
  state.currentStep=0;state.selectedComponentId=null;state.installedIds.clear();state.complete=false;state.poweredOn=false;
  componentData.forEach(c=>{
    const obj=partObjects.get(c.id); obj.position.set(4.2,.25,2.7-c.order*.72);obj.rotation.set(0,0,0);obj.scale.set(1,1,1);obj.userData.installed=false;
    obj.traverse(child=>{if(child.isMesh && child.material){child.material.color.setHex(c.color);child.material.transparent=false;child.material.opacity=1;}});
    const target=slotObjects.get(c.targetId); if(target){target.material.color.set(0x6bd4ff);target.material.opacity=.12;}
  });
  $('powerBtn').textContent='⏻ Power On';$('powerMessage').textContent='Complete the assembly to enable power.';
  renderUI();setFeedback('Assembly reset. Choose the Frame / Chassis to begin.','');
}
$('restartBtn').addEventListener('click',restart);
$('powerBtn').addEventListener('click',powerOn);
init3D();renderUI();
