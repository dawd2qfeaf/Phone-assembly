/* PHONE ASSEMBLY LAB — Stage 1
   Logika (state, validasi, progress) dipisah dari visual 3D.
   Jika Three.js gagal dimuat, perakitan tetap bisa dimainkan lewat panel. */
let THREE = null, OrbitControls = null;
try {
  THREE = await import('three');
  ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
} catch (e) { console.warn('3D tidak tersedia:', e); THREE = null; }

/* ---------- 1. DATA KOMPONEN ---------- */
// pos = posisi target (lokal ke body phone), size = ukuran slot
const parts = [
  { id:'frame',   name:'Frame / Chassis', stepName:'Prepare Frame',          fn:'Structural shell that supports and aligns the internal modules.', instruction:'Place the chassis on the assembly base.',        target:'Frame Base',            color:0x73889c, pos:[0,.08,0],       size:[2.6,.12,4.2] },
  { id:'port',    name:'Charging Port',   stepName:'Install Charging Port',  fn:'Receives charging power and wired data connection.',            instruction:'Fit the charging port along the bottom edge.',  target:'Bottom Port Slot',      color:0x69c9ed, pos:[0,.17,1.65],    size:[.6,.12,.22] },
  { id:'speaker', name:'Speaker',         stepName:'Install Speaker',        fn:'Converts electrical signals into sound.',                       instruction:'Install the speaker module in the lower bay.',  target:'Lower Speaker Bay',     color:0xd5a86b, pos:[0,.17,1.15],    size:[1.1,.12,.42] },
  { id:'board',   name:'Motherboard',     stepName:'Install Motherboard',    fn:'Connects and coordinates the phone’s electronic systems.',      instruction:'Seat the motherboard in the center board bay.', target:'Main Board Bay',        color:0x61b38a, pos:[0,.17,-.05],    size:[2.1,.12,1.35] },
  { id:'camera',  name:'Camera Module',   stepName:'Install Camera Module',  fn:'Captures light and converts it into image data.',               instruction:'Place the camera in the top camera bay.',       target:'Top Camera Bay',        color:0x8394e6, pos:[-1.05,.17,-1.45],size:[.75,.12,.6] },
  { id:'battery', name:'Battery',         stepName:'Install Battery',        fn:'Stores energy and supplies power to the device.',               instruction:'Place the battery in the battery bay.',         target:'Battery Bay',           color:0xc7d1dc, pos:[.35,.17,-.65],  size:[1.35,.12,1.55] },
  { id:'display', name:'Display',         stepName:'Install Display',        fn:'Shows visual information and detects touch input.',             instruction:'Install the display as the front layer.',       target:'Front Display Position',color:0x4ba5c8, pos:[0,.45,0],       size:[2.65,.12,4.15] },
  { id:'cover',   name:'Back Cover',      stepName:'Install Back Cover',     fn:'Protects internal components and closes the phone body.',       instruction:'Attach the back cover as the final step.',      target:'Rear Cover Position',   color:0x65707d, pos:[0,.68,0],       size:[2.75,.12,4.25] }
];
parts.forEach((p, i) => { p.order = i; p.installed = false; });
const byId = id => parts.find(p => p.id === id);

/* ---------- 2. STATE ---------- */
const state = { step:0, selected:null, target:null, installed:new Set(), complete:false, powered:false };
const $ = id => document.getElementById(id);
let V = null; // view 3D (opsional)

/* ---------- 3. LOGIKA PERAKITAN ---------- */
function feedback(msg, type = '') { const el = $('feedback'); el.innerHTML = msg; el.className = 'feedback' + (type ? ' ' + type : ''); }

function choosePart(id) {
  const p = byId(id);
  if (state.installed.has(id)) return feedback(`${p.name} is already installed.`, 'error');
  state.selected = id;
  render();
  feedback(`Selected <b>${p.name}</b>. Choose its slot (or drag it onto the phone), then press Install.`);
}
function chooseTarget(id) {
  if (state.installed.has(id)) return feedback('That slot is already filled.', 'error');
  state.target = id;
  render();
  feedback(`Slot chosen: <b>${byId(id).target}</b>.`);
}

// Validasi: cek identitas komponen vs target, lalu urutan langkah.
function tryInstall(partId, targetId) {
  const part = byId(partId);
  if (!part) return false;
  if (state.installed.has(partId)) { feedback(`${part.name} is already installed.`, 'error'); V?.returnHome(partId); return false; }
  if (!targetId) { feedback('Choose a target slot first.', 'error'); V?.returnHome(partId); return false; }
  if (targetId !== partId) {
    feedback(`❌ Wrong slot. <b>${part.name}</b> does not fit <b>${byId(targetId).target}</b>. Correct slot: ${part.target}.`, 'error');
    state.target = null; V?.returnHome(partId); render(); return false;
  }
  const active = parts[state.step];
  if (state.complete || part.id !== active.id) {
    feedback(`⚠ Wrong order. Right now you must install <b>${active.name}</b>.`, 'error');
    state.target = null; V?.returnHome(partId); render(); return false;
  }
  state.installed.add(partId); part.installed = true;
  state.step = parts.findIndex(p => !state.installed.has(p.id));
  if (state.step === -1) state.step = parts.length;
  state.selected = null; state.target = null;
  state.complete = state.installed.size === parts.length;
  V?.snap(partId);
  render();
  feedback(state.complete ? '🎉 <b>Assembly Complete!</b> Press Power On to test the phone.' : `✅ ${part.name} installed. Next: <b>${parts[state.step].name}</b>.`, 'success');
  return true;
}

function togglePower() {
  if (!state.complete) return;
  state.powered = !state.powered;
  $('powerMessage').textContent = state.powered ? '🎉 Phone powered on — assembly successful! Congratulations, you built a working phone.' : 'Phone is powered off.';
  render();
  feedback(state.powered ? 'Power-on test successful!' : 'Phone switched off.', 'success');
}

function restart() {
  state.step = 0; state.selected = null; state.target = null; state.installed.clear(); state.complete = false; state.powered = false;
  parts.forEach(p => p.installed = false);
  V?.reset();
  $('powerMessage').textContent = 'Finish installing all parts to enable.';
  render();
  feedback('Assembly reset. Select <b>Frame / Chassis</b> to begin.');
}

/* ---------- 4. RENDER UI (satu-satunya tempat UI mengikuti state) ---------- */
function render() {
  const n = state.installed.size, pct = n / parts.length * 100, active = parts[state.step];
  $('progressCount').textContent = `${n} / ${parts.length}`;
  $('progressFill').style.width = pct + '%';
  $('progressPercent').textContent = `Installed: ${n}/${parts.length} · ${+pct.toFixed(1)}%`;
  $('progressStatus').textContent = state.complete ? 'Assembly Complete' : 'Assembly in Progress';
  $('assemblyBadge').textContent = state.complete ? 'ASSEMBLY COMPLETE' : 'ASSEMBLY IN PROGRESS';
  $('assemblyBadge').classList.toggle('complete', state.complete);
  $('partsRemaining').textContent = `${parts.length - n} remaining`;
  $('stepTitle').textContent = state.complete ? 'All steps done' : `Step ${state.step + 1}/8 — ${active.stepName}`;
  $('stepInstruction').textContent = state.complete ? 'Everything is fitted. Power on the device.' : active.instruction;

  const sel = state.selected && byId(state.selected), tg = state.target && byId(state.target);
  $('selectedLabel').textContent = sel ? sel.name : 'None';
  $('targetLabel').textContent = tg ? tg.target : 'None';
  $('installBtn').disabled = !sel || !tg || state.complete;

  $('componentList').innerHTML = '';
  parts.forEach((p, i) => {
    const done = state.installed.has(p.id), b = document.createElement('button');
    b.className = 'component-item' + (state.selected === p.id ? ' selected' : '') + (!done && !state.complete && state.step === i ? ' current' : '');
    b.disabled = done;
    b.innerHTML = `<span class="number">${done ? '✓' : i + 1}</span><span class="part-name">${p.name}</span><span class="part-status ${done ? 'done' : ''}">${done ? 'Installed' : state.selected === p.id ? 'Selected' : state.step === i ? 'Next' : 'Waiting'}</span>`;
    b.onclick = () => { choosePart(p.id); V?.flash(p.id); };
    $('componentList').appendChild(b);
  });

  $('targetList').innerHTML = '';
  parts.forEach(p => {
    const done = state.installed.has(p.id), b = document.createElement('button');
    b.className = 'chip' + (state.target === p.id ? ' picked' : '') + (!done && !state.complete && parts[state.step].id === p.id ? ' active' : '');
    b.disabled = done; b.textContent = (done ? '✓ ' : '') + p.target;
    b.onclick = () => chooseTarget(p.id);
    $('targetList').appendChild(b);
  });

  const d = sel || (state.complete ? parts[parts.length - 1] : active);
  const status = state.installed.has(d.id) ? 'Installed' : d.id === active?.id ? 'Current step — ready to install' : 'Waiting';
  $('componentInfo').innerHTML = `<h3>${d.name}</h3><p><b>Function:</b> ${d.fn}</p><p><b>Install:</b> ${d.instruction}</p><p class="status"><b>Status:</b> ${status}</p>`;

  $('powerBtn').disabled = !state.complete;
  $('powerBtn').textContent = state.powered ? '⏻ Power Off' : '⏻ Power On';
  V?.sync();
}

/* ---------- 5. VISUAL 3D ---------- */
function build3D() {
  const host = $('scene');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f1722);
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, .1, 100);
  camera.position.set(8, 9, 11);
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement); $('sceneMsg').remove();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x39465b, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(5, 9, 5); scene.add(sun);
  scene.add(new THREE.GridHelper(16, 16, 0x2a3d52, 0x1b2a3b));

  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color:c, roughness:.55, metalness:.15, transparent:!!o.t, opacity:o.o ?? 1, wireframe:!!o.w });
  const box = (g, size, pos, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(c)); m.position.set(...pos); g.add(m); return m; };
  const phone = new THREE.Group(); scene.add(phone);
  box(phone, [3.1,.22,5], [0,-.12,0], 0x26394a); box(phone, [2.85,.12,4.7], [0,.03,0], 0x778a9c); box(phone, [2.6,.08,4.45], [0,.1,0], 0x1b2632);
  box(scene, [4.2,.15,7.6], [4.5,-.35,0], 0x1f2d3d);

  const label = (t, pos) => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.fillStyle = '#9fb8d0'; x.fillText(t, 256, 72);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(c), transparent:true })); s.position.set(...pos); s.scale.set(2.6, .65, 1); scene.add(s); };
  label('PHONE BODY', [0,1.2,-3.2]); label('COMPONENT TRAY', [4.5,1.2,-4.4]);

  // Bentuk komponen (primitive)
  function shape(p) {
    const g = new THREE.Group(), c = p.color;
    switch (p.id) {
      case 'frame': box(g,[2.45,.2,3.85],[0,0,0],c); box(g,[2.05,.22,3.4],[0,.02,0],0x263645); break;
      case 'port': box(g,[.5,.18,.23],[0,0,0],c); box(g,[.2,.2,.06],[0,.03,.08],0x131b24); break;
      case 'speaker': box(g,[.85,.18,.35],[0,0,0],c); for (let i=-2;i<=2;i++) box(g,[.06,.2,.1],[i*.12,.02,0],0x19232e); break;
      case 'board': box(g,[1.95,.2,1.2],[0,0,0],c); box(g,[.55,.23,.45],[.25,.03,0],0x263440); box(g,[.35,.23,.3],[-.5,.03,-.25],0x263440); break;
      case 'camera': { box(g,[.65,.18,.55],[0,0,0],c); const l = new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.18,18), mat(0x172333)); l.position.set(-.12,.1,0); g.add(l); break; }
      case 'battery': box(g,[1.2,.18,1.35],[0,0,0],c); box(g,[.7,.2,.55],[0,.03,0],0x98a6b5); break;
      case 'display': box(g,[2.35,.12,3.65],[0,0,0],c); break;
      case 'cover': box(g,[2.45,.16,3.85],[0,0,0],c); box(g,[.5,.18,.45],[-.85,0,-1.25],0x202b37); break;
    }
    return g;
  }
  // Layar: pelat di sisi bawah display; terlihat saat phone dibalik (Power On)
  const screenOff = new THREE.MeshBasicMaterial({ color:0x04070a });
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 410; const cx = cv.getContext('2d');
  const gr = cx.createLinearGradient(0,0,256,410); gr.addColorStop(0,'#1b6ec2'); gr.addColorStop(1,'#7b3fe4'); cx.fillStyle = gr; cx.fillRect(0,0,256,410);
  cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = 'bold 22px Arial'; cx.fillText('PHONE', 128, 190); cx.fillText('ASSEMBLY LAB', 128, 220); cx.font = '16px Arial'; cx.fillText('Hello! Assembly complete ✓', 128, 270);
  const screenOn = new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(cv) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.5), screenOff); screen.rotation.x = Math.PI / 2; screen.position.y = -.07;

  const HOME_SCALE = .45, homeOf = i => new THREE.Vector3(3.7 + (i % 2) * 1.6, .12, -2.7 + Math.floor(i / 2) * 1.8);
  const objs = {}, markers = {};
  parts.forEach((p, i) => {
    const o = shape(p); o.userData.partId = p.id; o.position.copy(homeOf(i)); o.scale.setScalar(HOME_SCALE);
    o.userData.goalPos = o.position.clone(); o.userData.goalScale = HOME_SCALE;
    if (p.id === 'display') o.add(screen);
    scene.add(o); objs[p.id] = o;
    const m = new THREE.Mesh(new THREE.BoxGeometry(...p.size), mat(0x62cfff, { t:true, o:.2, w:true }));
    m.position.set(...p.pos); m.userData.targetId = p.id; phone.add(m); markers[p.id] = m;
  });

  const dom = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0,1,0), -1.4);
  const setRay = e => { const r = dom.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); ray.setFromCamera(ndc, camera); };
  let drag = null, down = null;
  const pickPart = e => { setRay(e); const hit = ray.intersectObjects(parts.filter(p => !p.installed).map(p => objs[p.id]), true)[0]; let o = hit?.object; while (o && !o.userData.partId) o = o.parent; return o?.userData.partId; };

  dom.addEventListener('pointerdown', e => {      // didaftarkan SEBELUM OrbitControls
    down = { x:e.clientX, y:e.clientY };
    const id = pickPart(e);
    if (id) { drag = { id, moved:false }; orbit.enabled = false; dom.setPointerCapture(e.pointerId); }
  });
  dom.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) return;
    if (!drag.moved) { drag.moved = true; state.selected = drag.id; render(); }
    setRay(e); const pt = new THREE.Vector3();
    if (ray.ray.intersectPlane(plane, pt)) { const o = objs[drag.id]; o.userData.goalPos.copy(pt); o.position.lerp(pt, .6); o.userData.goalScale = 1; }
  });
  dom.addEventListener('pointerup', e => {
    const wasDrag = drag; drag = null; orbit.enabled = true;
    if (wasDrag) {
      if (!wasDrag.moved) { choosePart(wasDrag.id); return; }
      const pt = objs[wasDrag.id].userData.goalPos; let best = null, bd = 1e9;
      parts.forEach(p => { if (p.installed) return; const dx = Math.abs(pt.x - p.pos[0]) - p.size[0] / 2, dz = Math.abs(pt.z - p.pos[2]) - p.size[2] / 2, d = Math.max(dx, dz, 0); if (d < bd) { bd = d; best = p.id; } });
      if (bd > .5) { returnHome(wasDrag.id); feedback('Dropped outside any slot — part returned to the tray.', 'error'); return; }
      state.selected = wasDrag.id; state.target = best; tryInstall(wasDrag.id, best);
      return;
    }
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) { // klik slot
      setRay(e); const hit = ray.intersectObjects(parts.filter(p => !p.installed).map(p => markers[p.id]), false)[0];
      if (hit) chooseTarget(hit.object.userData.targetId);
    }
  });
  const orbit = new OrbitControls(camera, dom);
  orbit.enableDamping = true; orbit.target.set(1.8, 0, 0); orbit.maxPolarAngle = Math.PI * .48; orbit.minDistance = 7; orbit.maxDistance = 24;

  function returnHome(id) { const o = objs[id], i = byId(id).order; o.userData.goalPos.copy(homeOf(i)); o.userData.goalScale = HOME_SCALE; }
  let flipGoal = 0, pulse = 0;
  const api = {
    returnHome,
    snap(id) { const o = objs[id]; phone.attach(o); o.rotation.set(0,0,0); o.userData.goalPos = new THREE.Vector3(...byId(id).pos); o.userData.goalScale = 1; },
    reset() { parts.forEach((p, i) => { const o = objs[p.id]; scene.attach(o); o.rotation.set(0,0,0); o.userData.goalPos = homeOf(i); o.userData.goalScale = HOME_SCALE; }); },
    flash(id) { objs[id].userData.goalPos.y = .9; setTimeout(() => returnHome(id), 250); },
    sync() {
      flipGoal = state.powered ? Math.PI : 0; screen.material = state.powered ? screenOn : screenOff;
      parts.forEach(p => objs[p.id].traverse(m => { if (m.isMesh && m.material.emissive) m.material.emissive.set(state.selected === p.id ? 0x2a7aa0 : 0x000000); }));
      parts.forEach(p => {
        const m = markers[p.id], done = state.installed.has(p.id), act = !state.complete && parts[state.step].id === p.id;
        m.visible = !done; m.material.color.set(state.target === p.id ? 0xffd166 : act ? 0x62cfff : 0x60788e);
        m.material.opacity = state.target === p.id ? .75 : act ? .6 : .12;
      });
    }
  };
  (function loop() {
    requestAnimationFrame(loop); orbit.update(); pulse += .06;
    parts.forEach(p => { const o = objs[p.id]; if (drag && drag.moved && drag.id === p.id) { o.scale.lerp(new THREE.Vector3(1,1,1), .2); return; } o.position.lerp(o.userData.goalPos, .16); o.scale.setScalar(o.scale.x + (o.userData.goalScale - o.scale.x) * .16); });
    phone.rotation.x += (flipGoal - phone.rotation.x) * .08;
    if (!state.complete) markers[parts[state.step].id].material.opacity = .45 + .2 * Math.sin(pulse);
    renderer.render(scene, camera);
  })();
  addEventListener('resize', () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); });
  return api;
}

/* ---------- 6. INIT ---------- */
$('installBtn').onclick = () => tryInstall(state.selected, state.target);
$('restartBtn').onclick = restart;
$('powerBtn').onclick = togglePower;
if (THREE) { try { V = build3D(); } catch (e) { console.error(e); V = null; $('sceneMsg') && ($('sceneMsg').textContent = '3D view failed — use the panels below to assemble.'); } }
else $('sceneMsg').innerHTML = '3D view unavailable (Three.js could not load).<br>You can still assemble using the Parts Tray and Slot buttons.';
render();
