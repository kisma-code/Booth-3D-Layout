import * as THREE from 'three';
import { decryptJSON } from './crypto.js';
import { buildWorld } from './scene.js';
import { FPSControls } from './controls.js';

const DATA_URL = 'data/booth-data.enc.json';
const PW_KEY = 'booth3d.pw';
const PREVIEW_KEY = 'booth3d.preview';
const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);

const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* storage blocked */ } },
};

// Tag colour per BU. Unknown BUs get a stable colour from their name.
const BU_COLORS = { HV: '#ff6b7d', TR: '#ffb347', SV: '#5aa9ff', GI: '#4cd48a', GA: '#b98cff', CASE: '#3fd0d4', HR: '#f78fd0' };
const BU_FALLBACK = ['#ffd24d', '#7ee0c3', '#ff9a6b', '#9fb4ff', '#e07ef0'];
function buColor(bu) {
  const key = String(bu || '').trim().toUpperCase();
  if (BU_COLORS[key]) return BU_COLORS[key];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BU_FALLBACK[h % BU_FALLBACK.length];
}

// ---------- unlock ----------
async function loadData(password) {
  const res = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error('DATA_MISSING');
  return decryptJSON(await res.json(), password);
}

async function boot() {
  const preview = new URLSearchParams(location.search).has('preview') && store.get(PREVIEW_KEY);
  if (preview) {
    try { return start(JSON.parse(preview), true); } catch { /* fall through to password */ }
  }
  const saved = store.get(PW_KEY);
  if (saved) {
    try { return start(await loadData(saved)); } catch { store.del(PW_KEY); }
  }
  $('#lock').hidden = false;
  $('#pw').focus();
}

$('#lock-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('#pw').value;
  const btn = $('#lock-form button');
  const err = $('#lock-error');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Opening…';
  try {
    const data = await loadData(pw);
    store.set(PW_KEY, pw);
    $('#lock').hidden = true;
    start(data);
  } catch (ex) {
    err.textContent = ex.message === 'WRONG_PASSWORD' ? 'Wrong password. Try again.' : 'Cannot load the booth data. Reload the page.';
    btn.disabled = false;
    btn.textContent = 'Open booth';
  }
});

// ---------- main ----------
function start(data, isPreview = false) {
  const products = data.products || [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const ev = data.event || {};
  document.title = [ev.title, ev.stand].filter(Boolean).join(' · ') || 'Booth 3D';
  $('#loading').hidden = false;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  $('#stage').appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;

  const camera = new THREE.PerspectiveCamera(isTouch ? 72 : 68, innerWidth / innerHeight, 0.05, 120);
  const world = buildWorld(data, renderer);
  const { scene } = world;

  // Transparent decoration (glass cases) must not block clicks.
  scene.traverse((o) => {
    if (o.isMesh && !o.userData.productId && o.material?.transparent && o.material.opacity < 0.5) o.userData.noHit = true;
  });

  const controls = new FPSControls({ camera, dom: renderer.domElement, world, joystick: $('#joystick'), isTouch });
  const START = { x: -1.2, z: 6.2, yaw: 0.12 };
  controls.setPose(START.x, START.z, START.yaw, -0.08);

  // ---------- UI text ----------
  $('#hud-title').textContent = ev.title || '';
  $('#hud-sub').textContent = [ev.stand && `Booth ${ev.stand}`, ev.venue, ev.dates].filter(Boolean).join(' · ');
  $('#start-title').textContent = ev.title || 'Booth 3D';
  $('#start-sub').textContent = $('#hud-sub').textContent;
  if (isPreview) $('#preview-badge').hidden = false;

  const list = $('#product-list');
  for (const p of products) {
    if (!world.productMeshes.has(p.id)) continue;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="en"></span><span class="zh"></span>`;
    b.querySelector('.en').textContent = p.nameEn;
    b.querySelector('.zh').textContent = p.nameZh || '';
    b.addEventListener('click', () => goTo(p.id));
    li.appendChild(b);
    list.appendChild(li);
  }

  // ---------- state + overlays ----------
  let panelOpen = false, listOpen = false, started = false;

  function refreshOverlay() {
    const paused = !isTouch && !controls.locked && !controls.fallback && !panelOpen && !listOpen;
    $('#start').hidden = !paused;
    $('#crosshair').hidden = isTouch || !controls.locked;
    controls.enabled = started && !panelOpen && (isTouch || controls.locked || controls.fallback);
    $('#hint').textContent = isTouch
      ? 'Left stick: walk · Drag: look · Tap a product or the (i) marker'
      : controls.fallback
        ? 'WASD / arrows: walk · Drag: look · Click a product · P: product list'
        : 'WASD / arrows: walk · Mouse: look · Click: open product · Shift: run · P: list · Esc: pause';
  }
  controls.onLockChange = () => {
    if (controls.locked) started = true;
    refreshOverlay();
  };

  $('#start-btn').addEventListener('click', () => {
    started = true;
    controls.lock();
    refreshOverlay();
  });
  $('#start-list').addEventListener('click', () => openList(true));

  function openList(open) {
    listOpen = open;
    $('#drawer').hidden = !open;
    if (open) { controls.unlock(); closePanel(false); }
    refreshOverlay();
  }
  $('#list-btn').addEventListener('click', () => openList(!listOpen));
  $('#drawer-close').addEventListener('click', () => { openList(false); resume(); });

  function resume() {
    if (!isTouch && !controls.fallback && started) controls.lock();
  }

  // ---------- product panel ----------
  function openPanel(id) {
    const p = byId.get(id);
    if (!p) return;
    panelOpen = true;
    controls.unlock();
    setHover(null);
    const chip = $('#p-bu');
    chip.textContent = p.bu || '';
    chip.hidden = !p.bu;
    chip.style.setProperty('--chip', buColor(p.bu));
    $('#p-en').textContent = p.nameEn || '';
    $('#p-zh').textContent = p.nameZh || '';
    const desc = $('#p-desc');
    desc.textContent = '';
    if (p.description && p.description.trim() && p.description.trim() !== '-') {
      for (const para of p.description.split(/\n+/)) {
        const el = document.createElement('p');
        el.textContent = para;
        desc.appendChild(el);
      }
      desc.classList.remove('empty');
    } else {
      desc.textContent = 'Product description coming soon.';
      desc.classList.add('empty');
    }
    const link = $('#p-link');
    const ok = /^https:\/\//.test(p.link || '');
    link.hidden = !ok;
    if (ok) link.href = p.link;
    $('#panel').hidden = false;
    $('#panel-close').focus({ preventScroll: true });
    refreshOverlay();
  }
  function closePanel(andResume = true) {
    if (!panelOpen) return;
    panelOpen = false;
    $('#panel').hidden = true;
    refreshOverlay();
    if (andResume) resume();
  }
  $('#panel-close').addEventListener('click', () => closePanel());
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (panelOpen) closePanel(false);
      else if (listOpen) openList(false);
    }
    if (e.code === 'KeyP' && started && !/input|textarea/i.test(e.target.tagName)) openList(!listOpen);
  });

  function goTo(id) {
    const vp = world.viewpointFor(id);
    if (vp) {
      controls.setPose(vp.x, vp.z, 0);
      controls.lookAtPoint(vp.lookAt);
    }
    started = true;
    openList(false);
    openPanel(id);
  }

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  raycaster.far = 9;
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    if (clientX == null) ndc.set(0, 0);
    else ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      if (h.object.userData.noHit) continue;
      return h.object.userData.productId || null;
    }
    return null;
  }
  controls.onSelectAt = (x, y) => {
    const id = pick(x, y);
    if (id) openPanel(id);
  };

  let hovered = null;
  function setHover(id) {
    if (id === hovered) return;
    if (hovered) highlight(hovered, false);
    hovered = id;
    if (id) highlight(id, true);
    const tip = $('#tooltip');
    tip.hidden = !id;
    if (id) tip.textContent = byId.get(id)?.nameEn || '';
    renderer.domElement.style.cursor = id && controls.fallback ? 'pointer' : '';
  }
  function highlight(id, on) {
    for (const m of world.productMeshes.get(id) || []) {
      const mat = m.material, base = m.userData.base;
      if (mat.isMeshBasicMaterial) mat.opacity = on ? 0.1 : base.opacity;
      else if (mat.emissiveMap) mat.emissiveIntensity = on ? base.intensity * 1.6 : base.intensity;
      else if (mat.emissive) {
        mat.emissive.copy(on ? new THREE.Color(0x5a1a1a) : base.emissive);
        mat.emissiveIntensity = on ? 1 : base.intensity;
      }
    }
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let hoverTimer = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update(dt);
    world.update(clock.elapsedTime);
    hoverTimer += dt;
    if (!isTouch && controls.enabled && hoverTimer > 0.08) {
      hoverTimer = 0;
      if (controls.locked) setHover(pick(null));
      else if (controls.fallback && controls.mouse.inside) setHover(pick(controls.mouse.x, controls.mouse.y));
      else setHover(null);
      const tip = $('#tooltip');
      if (controls.fallback) {
        tip.style.left = `${controls.mouse.x}px`;
        tip.style.top = `${controls.mouse.y + 18}px`;
      } else {
        tip.style.left = '50%';
        tip.style.top = 'calc(50% + 22px)';
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  $('#loading').hidden = true;
  $('#hud').hidden = false;
  if (isTouch) {
    started = true;
    $('#joystick').hidden = false;
  }
  refreshOverlay();
  requestAnimationFrame(frame);

  // Test hook (used by automated screenshots only).
  window.__booth = { controls, goTo, openPanel, closePanel, pick, world, camera };
}

boot();
