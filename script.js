/* PHONE ASSEMBLY LAB — Stage 1 (Enhanced 3D Realism)
   Logika (state, validasi, progress) dipisah dari visual 3D.
   Jika Three.js gagal dimuat, perakitan tetap bisa dimainkan lewat panel. */
let THREE = null, OrbitControls = null;
try {
  THREE = await import('three');
  ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
} catch (e) { console.warn('3D tidak tersedia:', e); THREE = null; }

/* ---------- 1. DATA KOMPONEN ---------- */
const parts = [
  { id:'frame',   name:'Frame / Chassis', stepName:'Prepare Frame',          fn:'Structural shell that supports and aligns the internal modules.', instruction:'Place the chassis on the assembly base.',        target:'Frame Base',            color:0x5b6b7c, pos:[0,.08,0],        size:[2.6,.12,4.2] },
  { id:'port',    name:'Charging Port',   stepName:'Install Charging Port',  fn:'Receives charging power and wired data connection.',            instruction:'Fit the charging port along the bottom edge.',  target:'Bottom Port Slot',      color:0x2d7a53, pos:[0,.17,1.65],     size:[.65,.12,.32] },
  { id:'speaker', name:'Speaker',         stepName:'Install Speaker',        fn:'Converts electrical signals into sound.',                       instruction:'Install the speaker module in the lower bay.',  target:'Lower Speaker Bay',     color:0x2a2f36, pos:[0,.17,1.15],     size:[1.15,.12,.45] },
  { id:'board',   name:'Motherboard',     stepName:'Install Motherboard',    fn:'Connects and coordinates the phone’s electronic systems.',      instruction:'Seat the motherboard in the center board bay.', target:'Main Board Bay',        color:0x1b5e3a, pos:[0,.17,-.05],     size:[2.15,.12,1.4] },
  { id:'camera',  name:'Camera Module',   stepName:'Install Camera Module',  fn:'Captures light and converts it into image data.',               instruction:'Place the camera in the top camera bay.',       target:'Top Camera Bay',        color:0x232830, pos:[-1.02,.17,-1.45],size:[.8,.12,.68] },
  { id:'battery', name:'Battery',         stepName:'Install Battery',        fn:'Stores energy and supplies power to the device.',               instruction:'Place the battery in the battery bay.',         target:'Battery Bay',           color:0x363d47, pos:[.35,.17,-.65],   size:[1.35,.12,1.6] },
  { id:'display', name:'Display',         stepName:'Install Display',        fn:'Shows visual information and detects touch input.',             instruction:'Install the display as the front layer.',       target:'Front Display Position',color:0x14181f, pos:[0,.45,0],        size:[2.65,.12,4.15] },
  { id:'cover',   name:'Back Cover',      stepName:'Install Back Cover',     fn:'Protects internal components and closes the phone body.',       instruction:'Attach the back cover as the final step.',      target:'Rear Cover Position',   color:0x2c3e50, pos:[0,.68,0],        size:[2.75,.12,4.25] }
];
parts.forEach((p, i) => { p.order = i; p.installed = false; });
const byId = id => parts.find(p => p.id === id);

/* ---------- 2. STATE ---------- */
const state = { step:0, selected:null, target:null, installed:new Set(), complete:false, powered:false };
const $ = id => document.getElementById(id);
let V = null;

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

/* ---------- 4. RENDER UI ---------- */
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

/* ---------- 5. VISUAL 3D (REALISTIC HARDWARE) ---------- */
function build3D() {
  const host = $('scene');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d141d);
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, .1, 100);
  camera.position.set(7.5, 8.8, 10.5);
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement); $('sceneMsg').remove();

  // Pencahayaan studio multi-arah untuk pantulan metalik & kaca
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x263242, 1.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2); keyLight.position.set(6, 11, 7); scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.1); rimLight.position.set(-7, 6, -6); scene.add(rimLight);
  scene.add(new THREE.GridHelper(16, 16, 0x2a3d52, 0x182534));

  // Helper material & geometri realistis
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({
    color: c,
    roughness: o.r ?? 0.45,
    metalness: o.m ?? 0.2,
    transparent: !!o.t,
    opacity: o.o ?? 1,
    wireframe: !!o.w,
    map: o.map || null
  });

  const box = (g, size, pos, c, o = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(c, o));
    m.position.set(...pos); g.add(m); return m;
  };

  const cyl = (g, rt, rb, h, pos, c, o = {}, rot = [0,0,0]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 24), mat(c, o));
    m.position.set(...pos); m.rotation.set(...rot); g.add(m); return m;
  };

  // Geometri persegi dengan sudut membulat (rounded rectangle extrusion)
  function roundedRectGeo(w, d, radius, depth) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -d / 2, r = Math.min(radius, w / 2, d / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r);
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d);
    s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, depth / 2, 0);
    return geo;
  }

  // Tekstur prosedural untuk label baterai & silkscreen PCB
  function makeBatteryTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 320;
    const x = c.getContext('2d');
    x.fillStyle = '#2d333b'; x.fillRect(0, 0, 256, 320);
    x.strokeStyle = '#636e7b'; x.lineWidth = 6; x.strokeRect(10, 10, 236, 300);
    x.fillStyle = '#f59e0b'; x.fillRect(24, 30, 208, 28);
    x.fillStyle = '#111'; x.font = 'bold 16px sans-serif'; x.textAlign = 'center';
    x.fillText('LI-ION POLYMER BATTERY', 128, 49);
    x.fillStyle = '#e6edf3'; x.font = 'bold 24px monospace';
    x.fillText('5000 mAh', 128, 110);
    x.font = '14px monospace'; x.fillStyle = '#9baec8';
    x.fillText('Nominal Voltage: 3.85V', 128, 145);
    x.fillText('19.25 Wh · Rechargeable', 128, 170);
    x.fillText('Model: LAB-BP50', 128, 205);
    // Simbol daur ulang & peringatan sederhana
    x.strokeStyle = '#9baec8'; x.lineWidth = 2; x.strokeRect(48, 235, 160, 44);
    x.font = 'bold 13px sans-serif'; x.fillText('CE   FC   RoHS   ♻', 128, 262);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeChipTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#161b22'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#484f58'; x.lineWidth = 4; x.strokeRect(6, 6, 116, 116);
    x.fillStyle = '#c9d1d9'; x.font = 'bold 18px monospace'; x.textAlign = 'center';
    x.fillText('SNAP-8', 64, 56);
    x.font = '12px monospace'; x.fillStyle = '#8b949e';
    x.fillText('OCTA-CORE', 64, 80);
    x.fillText('ARM64 SoC', 64, 98);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const batteryTex = makeBatteryTexture();
  const chipTex = makeChipTexture();

  // Base Meja Kerja & Siluet Posisi Ponsel
  const phone = new THREE.Group(); scene.add(phone);
  const matBase = new THREE.Mesh(roundedRectGeo(3.2, 5.1, 0.35, 0.18), mat(0x1e2c3a, { r: 0.7, m: 0.3 }));
  matBase.position.y = -0.14; phone.add(matBase);
  const slotPad = new THREE.Mesh(roundedRectGeo(2.85, 4.7, 0.28, 0.06), mat(0x121b24, { r: 0.85, m: 0.1 }));
  slotPad.position.y = 0.04; phone.add(slotPad);

  // Tray Komponen di kanan
  const trayBase = new THREE.Mesh(roundedRectGeo(4.3, 7.7, 0.25, 0.14), mat(0x1a2634, { r: 0.65, m: 0.35 }));
  trayBase.position.set(4.5, -0.35, 0); scene.add(trayBase);

  const label = (t, pos) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d'); x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.fillStyle = '#9fb8d0'; x.fillText(t, 256, 72);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    s.position.set(...pos); s.scale.set(2.6, .65, 1); scene.add(s);
  };
  label('PHONE BODY', [0, 1.2, -3.2]); label('COMPONENT TRAY', [4.5, 1.2, -4.4]);

  // ---------- BENTUK KOMPONEN REALISTIS ----------
  function shape(p) {
    const g = new THREE.Group();

    switch (p.id) {
      case 'frame': {
        // Mid-frame aluminium CNC dengan sudut membulat & sekat kompartemen
        const outer = new THREE.Mesh(roundedRectGeo(2.55, 4.05, 0.25, 0.16), mat(0x7c8b99, { r: 0.28, m: 0.85 }));
        g.add(outer);
        // Rongga tengah gelap tempat komponen terpasang
        const cavity = new THREE.Mesh(roundedRectGeo(2.32, 3.82, 0.18, 0.11), mat(0x1f2730, { r: 0.7, m: 0.4 }));
        cavity.position.y = 0.04; g.add(cavity);
        // Sekat pemisah kompartemen baterai & motherboard
        box(g, [2.3, 0.09, 0.05], [0, 0.06, 0.75], 0x697785, { r: 0.35, m: 0.8 });
        box(g, [0.05, 0.09, 1.65], [-0.4, 0.06, -0.68], 0x697785, { r: 0.35, m: 0.8 });
        // Tombol Power & Volume di sisi kanan rangka
        box(g, [0.06, 0.08, 0.42], [1.3, 0.02, -0.65], 0x9aa8b6, { r: 0.25, m: 0.9 });
        box(g, [0.06, 0.08, 0.75], [1.3, 0.02, 0.15], 0x9aa8b6, { r: 0.25, m: 0.9 });
        // Lubang port USB-C & grill speaker di dinding bawah frame
        box(g, [0.34, 0.07, 0.06], [0, 0.01, 2.02], 0x0b0f14, { r: 0.9 });
        for (let i = -3; i <= 3; i++) {
          if (Math.abs(i) > 1) cyl(g, 0.02, 0.02, 0.06, [i * 0.14, 0.01, 2.02], 0x0b0f14, {}, [Math.PI / 2, 0, 0]);
        }
        // Garis antena plastik di sisi frame
        box(g, [2.57, 0.16, 0.04], [0, 0, -1.35], 0x323b44, { r: 0.6, m: 0.1 });
        box(g, [2.57, 0.16, 0.04], [0, 0, 1.35], 0x323b44, { r: 0.6, m: 0.1 });
        break;
      }

      case 'port': {
        // Sub-PCB hijauCharging Port
        box(g, [0.85, 0.05, 0.28], [0, 0, 0], 0x1e6b43, { r: 0.5, m: 0.2 });
        // Rumah konektor USB-C metalik perak
        box(g, [0.34, 0.11, 0.24], [0, 0.06, 0.05], 0xcfd8e3, { r: 0.22, m: 0.92 });
        // Rongga hitam & lidah pin USB-C di tengah
        box(g, [0.26, 0.06, 0.04], [0, 0.06, 0.16], 0x0d1117, { r: 0.8 });
        box(g, [0.18, 0.015, 0.05], [0, 0.06, 0.15], 0xd4af37, { r: 0.3, m: 0.9 });
        // Pin solder emas di belakang konektor
        for (let i = -4; i <= 4; i++) {
          box(g, [0.02, 0.03, 0.05], [i * 0.03, 0.03, -0.09], 0xfbbf24, { r: 0.25, m: 0.95 });
        }
        // Kabel fleksibel (ribbon) oranye tembaga
        box(g, [0.22, 0.02, 0.22], [-0.24, 0.03, -0.18], 0xd97706, { r: 0.4, m: 0.5 });
        box(g, [0.18, 0.03, 0.06], [-0.24, 0.04, -0.27], 0xfbbf24, { r: 0.25, m: 0.9 });
        break;
      }

      case 'speaker': {
        // Kotak resonansi akustik (Speaker Box) hitam matte
        box(g, [1.05, 0.14, 0.38], [0, 0.02, 0], 0x22272e, { r: 0.65, m: 0.15 });
        // Driver magnet melingkar di tengah
        cyl(g, 0.14, 0.15, 0.06, [0, 0.1, 0], 0x8b98a8, { r: 0.25, m: 0.9 });
        cyl(g, 0.08, 0.08, 0.07, [0, 0.105, 0], 0x374151, { r: 0.4, m: 0.7 });
        // Kisi-kisi pelindung & lubang suara
        for (let i = -3; i <= 3; i++) {
          box(g, [0.03, 0.03, 0.24], [0.28 + i * 0.045, 0.09, 0], 0x64748b, { r: 0.3, m: 0.8 });
        }
        // Dua pin kontak pegas berlapis emas
        box(g, [0.06, 0.05, 0.08], [-0.38, 0.09, -0.08], 0xfbbf24, { r: 0.2, m: 0.95 });
        box(g, [0.06, 0.05, 0.08], [-0.38, 0.09, 0.08], 0xfbbf24, { r: 0.2, m: 0.95 });
        break;
      }

      case 'board': {
        // Papan PCB hijau tua utama
        box(g, [2.02, 0.05, 1.25], [0, 0, 0], 0x165b33, { r: 0.45, m: 0.25 });
        // Jalur tembaga berlapis emas di tepi PCB
        box(g, [2.04, 0.03, 0.03], [0, 0, 0.62], 0xd4af37, { r: 0.3, m: 0.9 });
        box(g, [2.04, 0.03, 0.03], [0, 0, -0.62], 0xd4af37, { r: 0.3, m: 0.9 });
        // Prosesor utama (SoC) dengan tekstur cetak
        const soc = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), mat(0xffffff, { r: 0.35, m: 0.3, map: chipTex }));
        soc.position.set(0.32, 0.05, -0.05); g.add(soc);
        // EMI Shield kaleng logam pelindung IC
        box(g, [0.62, 0.07, 0.52], [-0.48, 0.05, -0.22], 0xb8c4d0, { r: 0.22, m: 0.92 });
        box(g, [0.46, 0.06, 0.38], [-0.52, 0.045, 0.32], 0xa5b3c2, { r: 0.25, m: 0.9 });
        // Chip RAM / Storage hitam kecil
        box(g, [0.28, 0.05, 0.32], [0.32, 0.045, 0.38], 0x181c22, { r: 0.4, m: 0.3 });
        // Soket konektor FPC (emas) untuk baterai, layar, dan kamera
        box(g, [0.24, 0.05, 0.09], [0.78, 0.045, 0.22], 0xf59e0b, { r: 0.25, m: 0.9 });
        box(g, [0.28, 0.05, 0.09], [-0.1, 0.045, 0.48], 0xf59e0b, { r: 0.25, m: 0.9 });
        box(g, [0.09, 0.05, 0.24], [-0.88, 0.045, -0.35], 0xf59e0b, { r: 0.25, m: 0.9 });
        // Kapasitor & resistor SMD mikro di sekitar SoC
        const smdPos = [[0.02,-0.15],[0.02,0.05],[0.62,-0.15],[0.62,0.05],[0.22,-0.36],[0.42,-0.36]];
        smdPos.forEach(([sx, sz]) => {
          box(g, [0.04, 0.03, 0.025], [sx, 0.04, sz], 0xc28e5c, { r: 0.4, m: 0.6 });
        });
        break;
      }

      case 'camera': {
        // Dudukan logam modul kamera ganda
        box(g, [0.68, 0.1, 0.56], [0, 0.02, 0], 0x262c34, { r: 0.35, m: 0.8 });
        // Lensa Utama (besar) + cincin krom + kaca optik kebiruan
        cyl(g, 0.16, 0.16, 0.11, [-0.14, 0.09, -0.08], 0x9aa8b6, { r: 0.2, m: 0.95 });
        cyl(g, 0.12, 0.12, 0.12, [-0.14, 0.095, -0.08], 0x0f172a, { r: 0.1, m: 0.4 });
        cyl(g, 0.07, 0.07, 0.125, [-0.14, 0.098, -0.08], 0x1d4ed8, { r: 0.08, m: 0.85 });
        // Lensa Ultra-wide (kecil)
        cyl(g, 0.11, 0.11, 0.1, [0.16, 0.085, 0.1], 0x9aa8b6, { r: 0.2, m: 0.95 });
        cyl(g, 0.075, 0.075, 0.11, [0.16, 0.09, 0.1], 0x0f172a, { r: 0.1, m: 0.4 });
        cyl(g, 0.04, 0.04, 0.115, [0.16, 0.092, 0.1], 0x0284c7, { r: 0.08, m: 0.85 });
        // Kabel pita fleksibel & soket penghubung ke motherboard
        box(g, [0.18, 0.02, 0.22], [0.15, 0.02, 0.34], 0xd97706, { r: 0.4, m: 0.5 });
        box(g, [0.16, 0.03, 0.06], [0.15, 0.025, 0.44], 0xfbbf24, { r: 0.25, m: 0.9 });
        break;
      }

      case 'battery': {
        // Sel pouch baterai dengan sudut membulat & label spesifikasi
        const cellGeo = roundedRectGeo(1.22, 1.42, 0.08, 0.13);
        const cellMat = mat(0xffffff, { r: 0.42, m: 0.35, map: batteryTex });
        const cell = new THREE.Mesh(cellGeo, cellMat);
        // Atur UV sederhana agar tekstur baterai tampil rapi di atas
        const posAttr = cellGeo.attributes.position;
        const uvAttr = cellGeo.attributes.uv;
        for (let i = 0; i < posAttr.count; i++) {
          uvAttr.setXY(i, (posAttr.getX(i) + 0.61) / 1.22, 1 - (posAttr.getZ(i) + 0.71) / 1.42);
        }
        g.add(cell);
        // Papan sirkuit proteksi (BMS) di ujung atas baterai
        box(g, [1.14, 0.08, 0.12], [0, 0.05, -0.73], 0x161b22, { r: 0.5, m: 0.3 });
        // Kabel fleksibel baterai menuju konektor motherboard
        box(g, [0.22, 0.02, 0.24], [-0.32, 0.05, -0.85], 0xd97706, { r: 0.4, m: 0.5 });
        box(g, [0.24, 0.035, 0.08], [-0.32, 0.055, -0.96], 0xfbbf24, { r: 0.25, m: 0.9 });
        break;
      }

      case 'display': {
        // Panel OLED + Kaca depan membulat dengan efek kilap kaca
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0x10151c,
          roughness: 0.12,
          metalness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08
        });
        const panel = new THREE.Mesh(roundedRectGeo(2.42, 3.88, 0.22, 0.07), glassMat);
        g.add(panel);
        // Bingkai earpiece speaker tipis di tepi atas layar
        box(g, [0.45, 0.02, 0.03], [0, 0.04, -1.84], 0x334155, { r: 0.4, m: 0.7 });
        // Lensa kamera depan (punch-hole) di sisi layar
        cyl(g, 0.055, 0.055, 0.02, [0, 0.038, -1.68], 0x090d16, { r: 0.1, m: 0.8 });
        cyl(g, 0.025, 0.025, 0.022, [0, 0.039, -1.68], 0x2563eb, { r: 0.05, m: 0.9 });
        // Ribbon kabel konektor layar di sisi bawah
        box(g, [0.36, 0.02, 0.22], [0, -0.02, 1.85], 0xd97706, { r: 0.4, m: 0.5 });
        break;
      }

      case 'cover': {
        // Penutup belakang kaca frosted (frosted glass back cover)
        const backMat = new THREE.MeshPhysicalMaterial({
          color: 0x2c4257,
          roughness: 0.24,
          metalness: 0.35,
          clearcoat: 0.85,
          clearcoatRoughness: 0.15
        });
        const back = new THREE.Mesh(roundedRectGeo(2.54, 4.02, 0.25, 0.08), backMat);
        g.add(back);
        // Island / Camera Bump kaca gelap di sudut kanan atas (sesuai posisi kamera saat terpasang)
        const bump = new THREE.Mesh(roundedRectGeo(0.78, 0.95, 0.14, 0.06), mat(0x16202b, { r: 0.18, m: 0.65 }));
        bump.position.set(-0.76, 0.06, -1.32); g.add(bump);
        // Dua cincin lensa dekoratif pada camera bump
        cyl(g, 0.17, 0.17, 0.05, [-0.76, 0.095, -1.52], 0x94a3b8, { r: 0.2, m: 0.95 });
        cyl(g, 0.12, 0.12, 0.055, [-0.76, 0.098, -1.52], 0x090d16, { r: 0.1, m: 0.5 });
        cyl(g, 0.17, 0.17, 0.05, [-0.76, 0.095, -1.12], 0x94a3b8, { r: 0.2, m: 0.95 });
        cyl(g, 0.12, 0.12, 0.055, [-0.76, 0.098, -1.12], 0x090d16, { r: 0.1, m: 0.5 });
        // LED Flash kecil di samping lensa
        cyl(g, 0.045, 0.045, 0.05, [-0.51, 0.09, -1.32], 0xfef08a, { r: 0.2, m: 0.3 });
        // Aksen garis/logo minimalis di tengah cover
        box(g, [0.35, 0.015, 0.08], [0, 0.045, 0.2], 0x94a3b8, { r: 0.25, m: 0.9 });
        break;
      }
    }
    return g;
  }

  // Layar menyala saat Power On
  const screenOff = new THREE.MeshBasicMaterial({ color: 0x04070a });
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 410; const cx = cv.getContext('2d');
  const gr = cx.createLinearGradient(0, 0, 256, 410); gr.addColorStop(0, '#0ea5e9'); gr.addColorStop(1, '#6366f1'); cx.fillStyle = gr; cx.fillRect(0, 0, 256, 410);
  cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = 'bold 22px Arial'; cx.fillText('PHONE', 128, 185); cx.fillText('ASSEMBLY LAB', 128, 215);
  cx.font = '15px Arial'; cx.fillText('Hardware Check: OK ✓', 128, 265);
  const screenOn = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.24, 3.66), screenOff);
  screen.rotation.x = Math.PI / 2; screen.position.y = -0.01;

  const HOME_SCALE = .45, homeOf = i => new THREE.Vector3(3.7 + (i % 2) * 1.6, .12, -2.7 + Math.floor(i / 2) * 1.8);
  const objs = {}, markers = {};
  parts.forEach((p, i) => {
    const o = shape(p); o.userData.partId = p.id; o.position.copy(homeOf(i)); o.scale.setScalar(HOME_SCALE);
    o.userData.goalPos = o.position.clone(); o.userData.goalScale = HOME_SCALE;
    if (p.id === 'display') o.add(screen);
    scene.add(o); objs[p.id] = o;
    const m = new THREE.Mesh(new THREE.BoxGeometry(...p.size), mat(0x62cfff, { t: true, o: .2, w: true }));
    m.position.set(...p.pos); m.userData.targetId = p.id; phone.add(m); markers[p.id] = m;
  });

  const dom = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.4);
  const setRay = e => { const r = dom.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); ray.setFromCamera(ndc, camera); };
  let drag = null, down = null;
  const pickPart = e => { setRay(e); const hit = ray.intersectObjects(parts.filter(p => !p.installed).map(p => objs[p.id]), true)[0]; let o = hit?.object; while (o && !o.userData.partId) o = o.parent; return o?.userData.partId; };

  dom.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY };
    const id = pickPart(e);
    if (id) { drag = { id, moved: false }; orbit.enabled = false; dom.setPointerCapture(e.pointerId); }
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
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
      setRay(e); const hit = ray.intersectObjects(parts.filter(p => !p.installed).map(p => markers[p.id]), false)[0];
      if (hit) chooseTarget(hit.object.userData.targetId);
    }
  });
  const orbit = new OrbitControls(camera, dom);
  orbit.enableDamping = true; orbit.target.set(1.8, 0, 0); orbit.maxPolarAngle = Math.PI * .48; orbit.minDistance = 6; orbit.maxDistance = 24;

  function returnHome(id) { const o = objs[id], i = byId(id).order; o.userData.goalPos.copy(homeOf(i)); o.userData.goalScale = HOME_SCALE; }
  let flipGoal = 0, pulse = 0;
  const api = {
    returnHome,
    snap(id) { const o = objs[id]; phone.attach(o); o.rotation.set(0, 0, 0); o.userData.goalPos = new THREE.Vector3(...byId(id).pos); o.userData.goalScale = 1; },
    reset() { parts.forEach((p, i) => { const o = objs[p.id]; scene.attach(o); o.rotation.set(0, 0, 0); o.userData.goalPos = homeOf(i); o.userData.goalScale = HOME_SCALE; }); },
    flash(id) { objs[id].userData.goalPos.y = .9; setTimeout(() => returnHome(id), 250); },
    sync() {
      flipGoal = state.powered ? Math.PI : 0; screen.material = state.powered ? screenOn : screenOff;
      parts.forEach(p => objs[p.id].traverse(m => { if (m.isMesh && m.material && m.material.emissive) m.material.emissive.set(state.selected === p.id ? 0x1d5b79 : 0x000000); }));
      parts.forEach(p => {
        const m = markers[p.id], done = state.installed.has(p.id), act = !state.complete && parts[state.step].id === p.id;
        m.visible = !done; m.material.color.set(state.target === p.id ? 0xffd166 : act ? 0x62cfff : 0x60788e);
        m.material.opacity = state.target === p.id ? .75 : act ? .6 : .12;
      });
    }
  };
  (function loop() {
    requestAnimationFrame(loop); orbit.update(); pulse += .06;
    parts.forEach(p => { const o = objs[p.id]; if (drag && drag.moved && drag.id === p.id) { o.scale.lerp(new THREE.Vector3(1, 1, 1), .2); return; } o.position.lerp(o.userData.goalPos, .16); o.scale.setScalar(o.scale.x + (o.userData.goalScale - o.scale.x) * .16); });
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
