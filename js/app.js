import * as THREE from 'three';
import { decryptJSON } from './crypto.js';
import { buildWorld } from './scene.js';
import { FPSControls } from './controls.js';
import { buColor, buKey, compareBu } from './bu.js';
import { t, pick as pickText, applyStatic, toggleLang, onLangChange } from './i18n.js';

const DATA_URL = 'data/booth-data.enc.json';
const PW_KEY = 'booth3d.pw';
const PREVIEW_KEY = 'booth3d.preview';
const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);
applyStatic();
$('#lang-btn').addEventListener('click', (e) => { toggleLang(); e.currentTarget.blur(); });

const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* storage blocked */ } },
};


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
  btn.textContent = t('opening');
  let data;
  try {
    data = await loadData(pw);
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.message === 'WRONG_PASSWORD' ? t('wrongPw') : t('loadFail');
    btn.disabled = false;
    btn.textContent = t('open');
    return;
  }
  store.set(PW_KEY, pw);
  $('#lock').hidden = true;
  start(data);
});

// ---------- main ----------
// Wall graphics are painted on canvas, so the web fonts must be ready first.
// Loads every weight for all characters in the data; gives up after 4 s (fallback fonts).
async function loadFonts(data) {
  if (!document.fonts?.load) return;
  const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + JSON.stringify(data);
  const specs = ['400', '500', '600', '700', '800'].flatMap((w) => [`${w} 16px "Archivo"`, `${w} 16px "Noto Sans TC"`]);
  specs.push('800 expanded 16px "Archivo"');
  const all = Promise.all(specs.map((s) => document.fonts.load(s, text).catch(() => null)));
  await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
}

async function start(data, isPreview = false) {
  const products = data.products || [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const ev = data.event || {};
  document.title = [ev.title, ev.stand].filter(Boolean).join(' · ') || 'Booth 3D';
  $('#loading').hidden = false;
  await loadFonts(data);

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
  function renderEventText() {
    $('#hud-title').textContent = ev.title || '';
    $('#hud-sub').textContent = [ev.stand && t('booth', ev.stand), ev.venue, ev.dates].filter(Boolean).join(' · ');
    $('#start-title').textContent = ev.title || t('title');
    $('#start-sub').textContent = $('#hud-sub').textContent;
  }
  renderEventText();
  if (isPreview) $('#preview-badge').hidden = false;

  const list = $('#product-list');
  function renderList() {
  list.replaceChildren();
  // Grouped by BU (A–Z, no BU last); each row is tinted with its BU tag colour.
  const groups = new Map();
  for (const p of products) {
    if (!world.productMeshes.has(p.id)) continue;
    const bu = buKey(p.bu);
    if (!groups.has(bu)) groups.set(bu, []);
    groups.get(bu).push(p);
  }
  const buOrder = [...groups.keys()].sort(compareBu);
  for (const bu of buOrder) {
    const color = buColor(bu);
    const head = document.createElement('li');
    head.className = 'bu-head';
    head.style.setProperty('--bu', color);
    head.textContent = bu || t('other');
    list.appendChild(head);
    for (const p of groups.get(bu)) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--bu', color);
      b.innerHTML = `<span class="en"></span><span class="zh"></span>`;
      // Name in the chosen language first, the other language below.
      const main = pickText(p.nameEn, p.nameZh);
      b.querySelector('.en').textContent = main;
      b.querySelector('.zh').textContent = main === p.nameEn ? (p.nameZh || '') : (p.nameEn || '');
      b.addEventListener('click', () => goTo(p.id));
      li.appendChild(b);
      list.appendChild(li);
    }
  }
  }
  renderList();

  // ---------- state + overlays ----------
  let panelOpen = false, listOpen = false, started = false;

  function refreshOverlay() {
    const paused = !isTouch && !controls.locked && !controls.fallback && !panelOpen && !listOpen;
    $('#start').hidden = !paused;
    $('#crosshair').hidden = isTouch || !controls.locked;
    controls.enabled = started && !panelOpen && (isTouch || controls.locked || controls.fallback);
    $('#hint').textContent = t(isTouch ? 'hintTouch' : controls.fallback ? 'hintDrag' : 'hintLock');
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

  // ---------- business card (Contact sales) ----------
  // Each product has its own card (product.contact); data.contact is an old-format fallback.
  const contactFor = (p) => p?.contact || data.contact || {};
  const hasContact = (c) => Boolean(c.nameEn || c.email || c.mobile);
  let cardOpen = false;
  let contact = {};
  function openCard() {
    const set = (id, v) => { $(id).textContent = v || ''; };
    set('#c-brand', data.brand?.name);
    set('#c-name-en', contact.nameEn);
    set('#c-name-zh', contact.nameZh);
    set('#c-title-en', contact.titleEn);
    set('#c-title-zh', contact.titleZh);
    set('#c-mobile', contact.mobile);
    set('#c-email', contact.email);
    set('#c-company', data.brand?.company);
    $('#c-mobile-row').hidden = !contact.mobile;
    $('#c-email-row').hidden = !contact.email;
    $('#card-overlay').hidden = false;
    cardOpen = true;
    $('#card-close').focus({ preventScroll: true });
  }
  function closeCard() {
    if (!cardOpen) return;
    cardOpen = false;
    $('#card-overlay').hidden = true;
    $('#p-contact').focus({ preventScroll: true });
  }
  $('#p-contact').addEventListener('click', openCard);
  $('#card-close').addEventListener('click', closeCard);
  $('#card-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCard(); });

  // ---------- product panel ----------
  let panelId = null;
  function openPanel(id) {
    const p = byId.get(id);
    if (!p) return;
    panelId = id;
    panelOpen = true;
    controls.unlock();
    setHover(null);
    const chip = $('#p-bu');
    chip.textContent = p.bu || '';
    chip.hidden = !p.bu;
    chip.style.setProperty('--chip', buColor(p.bu));
    const main = pickText(p.nameEn, p.nameZh);
    $('#p-en').textContent = main;
    $('#p-zh').textContent = main === p.nameEn ? (p.nameZh || '') : (p.nameEn || '');
    const desc = $('#p-desc');
    desc.textContent = '';
    const clean = (s) => (s && s.trim() && s.trim() !== '-' ? s : '');
    const text = pickText(clean(p.description), clean(p.descriptionZh));
    if (text) {
      for (const para of text.split(/\n+/)) {
        const el = document.createElement('p');
        el.textContent = para;
        desc.appendChild(el);
      }
      desc.classList.remove('empty');
    } else {
      desc.textContent = t('comingSoon');
      desc.classList.add('empty');
    }
    const link = $('#p-link');
    const ok = /^https:\/\//.test(p.link || '');
    link.hidden = !ok;
    if (ok) link.href = p.link;
    contact = contactFor(p);
    $('#p-contact').hidden = !hasContact(contact);
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
      if (cardOpen) closeCard();
      else if (panelOpen) closePanel(false);
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
    if (id) { const p = byId.get(id); tip.textContent = pickText(p?.nameEn, p?.nameZh); tip.dataset.suffix = t('clickSuffix'); }
    renderer.domElement.style.cursor = id && controls.fallback ? 'pointer' : '';
  }
  function highlight(id, on) {
    for (const m of world.productMeshes.get(id) || []) {
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        const base = mat.userData.base;
        if (!base) continue;
        if (mat.isMeshBasicMaterial) mat.opacity = on ? 0.1 : base.opacity;
        else if (mat.emissiveMap) mat.emissiveIntensity = on ? base.intensity * 1.6 : base.intensity;
        else if (mat.emissive) {
          mat.emissive.copy(on ? new THREE.Color(0x5a1a1a) : base.emissive);
          mat.emissiveIntensity = on ? 1 : base.intensity;
        }
      }
    }
  }

  // ---------- language switch ----------
  onLangChange(() => {
    renderEventText();
    renderList();
    refreshOverlay();
    if (panelOpen && panelId) openPanel(panelId);
    if (hovered) { const p = byId.get(hovered); $('#tooltip').textContent = pickText(p?.nameEn, p?.nameZh); $('#tooltip').dataset.suffix = t('clickSuffix'); }
  });

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
  $('#list-btn').hidden = false;
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
