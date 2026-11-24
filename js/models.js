// Stand-in 3D models for products. Origin = bottom centre, front = +Z.
// Replace with real GLB models later if you have them.
import * as THREE from 'three';
import { paintTexture, FONT } from './textures.js';

const mats = {};
function m(key, params) {
  if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial(params);
  return mats[key];
}
const light = () => m('light', { color: 0xd9dbdf, roughness: 0.45, metalness: 0.2 });
const dark = () => m('dark', { color: 0x2a2d33, roughness: 0.5, metalness: 0.3 });
const steel = () => m('steel', { color: 0x8c929c, roughness: 0.35, metalness: 0.7 });
const white = () => m('white', { color: 0xf2f2f2, roughness: 0.6 });
const gisWhite = () => m('gisWhite', { color: 0xf4f4f2, roughness: 0.35, metalness: 0.05 });
const red = () => m('red', { color: 0xd4001f, roughness: 0.5 });
const screen = () => m('screen', { color: 0x111111, emissive: 0x6f8fe8, emissiveIntensity: 0.9, roughness: 0.3 });
const green = () => m('green', { color: 0x00aa33, emissive: 0x22ff66, emissiveIntensity: 1.2 });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}
function cyl(r, h, mat, x = 0, y = 0, z = 0, seg = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}
/** Cylinder lying along X (axis = 'x') or Z (axis = 'z'), centred at (x, y, z). */
function tube(r, len, mat, axis, x, y, z, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  else mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}
/** Box with its own front (+Z) material. */
function faceBox(w, h, d, side, front, x = 0, y = 0, z = 0, top = side) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, front, side]);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}
const texMat = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.45, ...extra });

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, s, x, y, size, color, weight = '700', align = 'center') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function laptop(g, x = 0) {
  g.add(box(0.34, 0.018, 0.24, dark(), x, 0, 0));
  const lid = new THREE.Group();
  lid.position.set(x, 0.018, -0.115);
  lid.rotation.x = -0.25;
  lid.add(box(0.34, 0.22, 0.012, dark(), 0, 0, 0), box(0.31, 0.19, 0.002, screen(), 0, 0.015, 0.007));
  g.add(lid);
}

// ---------- Protection and control devices ----------

function bayControllerFront() {
  return paintTexture(42, 27, (c, w, h) => {
    c.fillStyle = '#d8d9da'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b9bbbe'; c.lineWidth = 0.12;
    c.strokeRect(0.4, 0.4, w - 0.8, h - 0.8);
    c.beginPath(); c.moveTo(17, 1.2); c.lineTo(17, h - 0.6); c.stroke();
    // status strip
    c.fillStyle = '#c9cbce'; c.fillRect(17.6, 1.2, 23.6, 1.2);
    [['#38c25a', 21], ['#c7c9cc', 26], ['#c7c9cc', 31]].forEach(([col, x]) => { c.fillStyle = col; c.beginPath(); c.arc(x, 1.8, 0.3, 0, 7); c.fill(); });
    // keys left of LCD
    c.fillStyle = '#c4c6c9'; c.fillRect(17.6, 2.8, 23.6, 9.8);
    for (let i = 0; i < 5; i++) { c.fillStyle = '#4f86d9'; rr(c, 18.3, 3.3 + i * 1.85, 1.3, 1.4, 0.15); c.fill(); }
    // LCD with a single-line diagram
    c.fillStyle = '#7fd2ec'; c.fillRect(20.2, 3.1, 9.4, 8.6);
    c.strokeStyle = '#1d3b48'; c.lineWidth = 0.12;
    c.beginPath(); c.moveTo(21, 4.3); c.lineTo(28.5, 4.3); c.moveTo(21, 4.7); c.lineTo(28.5, 4.7); c.stroke();
    for (const x of [22.5, 25.5]) {
      c.beginPath(); c.moveTo(x, 4.7); c.lineTo(x, 6); c.lineTo(x + 0.6, 6.6); c.moveTo(x, 7); c.lineTo(x, 9.5); c.lineTo(x + 0.7, 10); c.stroke();
    }
    c.font = `500 0.45px ${FONT}`; c.fillStyle = '#1d3b48'; c.fillText('Main menu / Control / Single line diagram', 20.5, 3.6);
    // LED list
    c.fillStyle = '#f3f3f3'; c.fillRect(30.2, 3.1, 4.4, 8.6);
    for (let i = 0; i < 12; i++) { c.fillStyle = '#b9bcc0'; c.beginPath(); c.arc(29.8, 3.5 + i * 0.7, 0.18, 0, 7); c.fill(); c.fillRect(30.5, 3.4 + i * 0.7, 3.6, 0.04); }
    // keypad
    c.fillStyle = '#c4c6c9'; c.fillRect(17.6, 13, 23.6, 6.4);
    c.fillStyle = '#2e9a4a'; rr(c, 18.3, 13.6, 1.3, 1.6, 0.15); c.fill();
    text(c, 'I', 18.95, 14.4, 1.1, '#fff');
    c.fillStyle = '#d6232f'; rr(c, 18.3, 16.8, 1.3, 1.6, 0.15); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 0.18; c.beginPath(); c.arc(18.95, 17.6, 0.45, 0, 7); c.stroke();
    const key = (x, y) => { c.fillStyle = '#4f86d9'; rr(c, x, y, 1.3, 1.3, 0.15); c.fill(); };
    [[21.5, 13.8], [24.5, 13.6], [23.2, 15.4], [25.8, 15.4], [24.5, 17.2], [28.2, 13.8], [28.2, 16.8], [31.5, 13.6], [33.2, 13.6], [31.5, 15.4], [33.2, 15.4], [31.5, 17.2]].forEach(([x, y]) => key(x, y));
    c.fillStyle = '#f1f1f1'; c.fillRect(34.5, 17, 1.6, 1.7);
    c.fillStyle = '#e1e2e3'; c.fillRect(17.6, 19.8, 23.6, 6.6);
  }, 14);
}

function ribbedTex(base, rib, horizontal = true) {
  return paintTexture(30, 30, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    c.fillStyle = rib;
    for (let i = 1; i < 30; i += 1.6) horizontal ? c.fillRect(0, i, w, 0.35) : c.fillRect(i, 0, 0.35, h);
  }, 8);
}

function touchRelayFront(brand) {
  return paintTexture(28, 17, (c, w, h) => {
    c.fillStyle = '#f2f2f2'; rr(c, 0, 0, w, h, 1); c.fill();
    c.fillStyle = '#b8bcc2'; c.fillRect(0, 0, 1.2, h); c.fillRect(w - 1.2, 0, 1.2, h);
    c.fillStyle = '#16181b'; rr(c, 2.4, 1.3, 20.8, 14.4, 0.8); c.fill();
    const g = c.createLinearGradient(3.6, 2.5, 22, 14.5);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe8ee');
    c.fillStyle = g; c.fillRect(3.6, 2.6, 18.4, 11.6);
    if (brand) text(c, brand, 12.8, 7.2, 2.6, '#1c1d20', '800');
    text(c, 'HMI in standby mode.', 12.8, 10, 0.8, '#3a3d44', '500');
    text(c, 'Tap the screen to continue.', 12.8, 11.3, 0.8, '#3a3d44', '500');
    if (brand) text(c, brand, 12.8, 1.9, 0.75, '#f2f2f2', '800');
    [['#33c46b', 4], ['#c9cbce', 5.3], ['#c9cbce', 6.6]].forEach(([col, y]) => { c.fillStyle = col; c.beginPath(); c.arc(24.6, y, 0.3, 0, 7); c.fill(); });
  }, 14);
}

function mergingUnitFront(brand) {
  return paintTexture(22, 25, (c, w, h) => {
    c.fillStyle = '#eceded'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c9cbce'; c.lineWidth = 0.15; c.strokeRect(0.4, 0.4, w - 0.8, h - 0.8);
    c.fillStyle = '#c8102e'; c.fillRect(3, 2.5, 7, 1.6);
    if (brand) text(c, brand, 6.5, 3.3, 0.9, '#fff', '800');
    for (let i = 0; i < 3; i++) { c.fillStyle = '#bfc2c6'; c.fillRect(17.5, 6 + i * 1.4, 2.4, 0.7); }
  }, 12);
}

// ---------- Gas-insulated switchgear model (white, in a glass case) ----------
function gis(g) {
  const W = gisWhite();
  const F = m('gisFlange', { color: 0xe2e3e4, roughness: 0.35, metalness: 0.1 });
  // base tank along X
  g.add(tube(0.065, 0.56, W, 'x', 0, 0.09, 0.06));
  for (const x of [-0.28, 0.28]) g.add(tube(0.075, 0.02, F, 'x', x, 0.09, 0.06));
  g.add(box(0.07, 0.03, 0.004, m('gisLabel', { color: 0x55c36b, roughness: 0.5 }), 0.02, 0.075, 0.127));
  for (const x of [-0.22, 0.22]) g.add(box(0.06, 0.03, 0.12, F, x, 0, 0.06));
  // left module: vertical drum with side flanges
  g.add(cyl(0.055, 0.34, W, -0.18, 0.14, -0.02));
  for (const y of [0.22, 0.34, 0.46]) g.add(cyl(0.062, 0.015, F, -0.18, y, -0.02));
  for (const [y, z] of [[0.3, 0.07], [0.4, 0.07]]) {
    g.add(tube(0.035, 0.1, W, 'z', -0.18, y, z));
    g.add(tube(0.05, 0.012, F, 'z', -0.18, y, z + 0.055));
  }
  g.add(tube(0.035, 0.14, W, 'x', -0.08, 0.42, -0.02));
  // middle cluster of round flanges
  for (const [x, y] of [[-0.03, 0.27], [0.06, 0.27], [-0.03, 0.37], [0.06, 0.37]]) {
    g.add(tube(0.04, 0.12, W, 'z', x, y, 0.0));
    g.add(tube(0.052, 0.014, F, 'z', x, y, 0.066));
  }
  // right module: taller drum with stacked flanges
  g.add(cyl(0.06, 0.42, W, 0.19, 0.14, -0.03));
  for (const y of [0.24, 0.36, 0.48]) g.add(cyl(0.068, 0.015, F, 0.19, y, -0.03));
  for (const [x, y] of [[0.14, 0.33], [0.24, 0.33], [0.19, 0.44]]) {
    g.add(tube(0.042, 0.1, W, 'z', x, y, 0.06));
    g.add(tube(0.054, 0.014, F, 'z', x, y, 0.115));
  }
  g.add(tube(0.03, 0.16, W, 'x', 0.32, 0.2, 0.02));
}

// ---------- Container switchgear with two Y bushing sets ----------
function igaSide(wCm, hCm, doors) {
  return paintTexture(wCm, hCm, (c, w, h) => {
    c.fillStyle = '#f7f7f6'; c.fillRect(0, 0, w, h);
    for (let x = 1; x < w; x += 2.2) {
      c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(x, 0, 0.5, h);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x + 0.5, 0, 0.3, h);
    }
    c.fillStyle = '#1e2024'; c.fillRect(0, h - 2.2, w, 2.2);
    for (const d of doors) {
      c.fillStyle = '#f3f3f2'; c.fillRect(d.x, 4, d.w, h - 9);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.18; c.strokeRect(d.x, 4, d.w, h - 9);
      c.fillStyle = '#9aa3b5'; c.fillRect(d.x + d.w - 1.2, 12, 0.6, 1.2); c.fillRect(d.x + d.w - 1.2, h - 14, 0.6, 1.2);
      if (d.warn) {
        c.fillStyle = '#f2c230'; c.beginPath(); c.moveTo(d.x + d.w / 2, 12); c.lineTo(d.x + d.w / 2 + 1.2, 14.2); c.lineTo(d.x + d.w / 2 - 1.2, 14.2); c.fill();
      }
      if (d.vents) for (let i = 0; i < d.vents; i++) {
        c.fillStyle = '#7d828a'; c.fillRect(d.x + 1.5 + i * 3.4, h - 14, 2.6, 6);
        c.fillStyle = '#9ea3aa'; for (let k = 0; k < 6; k++) c.fillRect(d.x + 1.5 + i * 3.4, h - 13.5 + k, 2.6, 0.25);
      }
    }
    for (const x of [8, w * 0.47, w - 22]) {
      c.fillStyle = '#d6d8dc'; c.fillRect(x, h - 9.5, 3.2, 3.2);
      c.strokeStyle = '#8e939a'; c.lineWidth = 0.15; c.beginPath(); c.arc(x + 1.6, h - 7.9, 1.2, 0, 7); c.stroke();
    }
  }, 6);
}

function bushingSet(g, x, z, y0) {
  const W = gisWhite();
  const ins = m('insulator', { color: 0xc4c8cd, roughness: 0.55 });
  g.add(cyl(0.032, 0.16, W, x, y0, z));
  const ringG = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 8, 24), m('ringG', { color: 0x2fae5a, roughness: 0.5 }));
  ringG.rotation.x = Math.PI / 2; ringG.position.set(x, y0 + 0.03, z);
  const ringR = ringG.clone(); ringR.material = m('ringR', { color: 0xd4001f, roughness: 0.5 }); ringR.position.y = y0 + 0.11;
  g.add(ringG, ringR);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), W);
  hub.position.set(x, y0 + 0.19, z);
  g.add(hub);
  const shedGeo = new THREE.CylinderGeometry(0.038, 0.032, 0.008, 18);
  const coreGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.42, 12);
  for (const az of [0, 2.1, 4.2]) {
    const arm = new THREE.Group();
    arm.position.set(x, y0 + 0.19, z);
    arm.rotation.set(0, az + 0.4, 0.6);
    const core = new THREE.Mesh(coreGeo, ins);
    core.position.y = 0.21;
    arm.add(core);
    for (let i = 0; i < 12; i++) {
      const shed = new THREE.Mesh(shedGeo, ins);
      shed.position.y = 0.06 + i * 0.03;
      arm.add(shed);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), steel());
    cap.position.y = 0.44;
    arm.add(cap);
    g.add(arm);
  }
}

function containerSwitchgear(g) {
  const L = 1.65, H = 0.42, D = 0.5;
  const long = texMat(igaSide(165, 42, [
    { x: 34, w: 22, warn: true }, { x: 70, w: 22, warn: true }, { x: 128, w: 16, vents: 1 }, { x: 146, w: 16, vents: 1, warn: true },
  ]), { roughness: 0.5 });
  const back = texMat(igaSide(165, 42, [{ x: 20, w: 22 }, { x: 100, w: 22, warn: true }]), { roughness: 0.5 });
  const end = texMat(igaSide(50, 42, [{ x: 6, w: 16, vents: 1 }, { x: 26, w: 16, vents: 1 }]), { roughness: 0.5 });
  const top = m('igaTop', { color: 0xf3f3f2, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(L, H, D), [end, end, top, top, long, back]);
  body.position.y = H / 2 + 0.02;
  g.add(body);
  g.add(box(L + 0.01, 0.02, D + 0.01, m('igaBase', { color: 0x1e2024, roughness: 0.5 })));
  bushingSet(g, -0.42, -0.08, H + 0.02);
  bushingSet(g, 0.3, -0.08, H + 0.02);
}

// ---------- Tall filter cabinet ----------
function pqFront(brand) {
  return paintTexture(60, 212, (c, w, h) => {
    c.fillStyle = '#d7d9dc'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.3; c.strokeRect(1.5, 1.5, w - 3, h - 3);
    // brand label
    c.fillStyle = '#d0102c'; c.fillRect(12, 5, 36, 7);
    if (brand) text(c, brand, 30, 8.7, 5, '#fff', '800');
    c.fillStyle = '#eceded'; c.fillRect(27, 15.5, 6, 1.5);
    // touch screen
    c.fillStyle = '#f4f4f4'; rr(c, 22, 23, 17, 13, 1); c.fill();
    c.fillStyle = '#121316'; c.fillRect(23.5, 25.5, 14, 9);
    // mesh grille with module rows
    const gx = 25, gy = 46, gw = 31, gh = 150;
    c.fillStyle = '#9fa3a9'; c.fillRect(gx, gy, gw, gh);
    for (let i = 0; i < 7; i++) {
      c.fillStyle = i === 0 ? '#3b3d42' : '#c3c6ca';
      c.fillRect(gx + 2, gy + 2 + i * 18.5, gw - 4, 16);
      c.strokeStyle = '#6f737a'; c.lineWidth = 0.25; c.strokeRect(gx + 9, gy + 6 + i * 18.5, 12, 6);
    }
    c.fillStyle = '#2b2d31'; c.fillRect(gx, gy + 132, gw, 18);
    c.strokeStyle = 'rgba(40,42,46,0.45)'; c.lineWidth = 0.18;
    for (let k = -gh; k < gw + gh; k += 1.4) {
      c.beginPath(); c.moveTo(gx + k, gy); c.lineTo(gx + k + gh * 0.4, gy + gh); c.stroke();
      c.beginPath(); c.moveTo(gx + k + gh * 0.4, gy); c.lineTo(gx + k, gy + gh); c.stroke();
    }
    c.strokeStyle = '#8d9197'; c.lineWidth = 0.4; c.strokeRect(gx, gy, gw, gh);
    // danger label + handle
    c.fillStyle = '#ffffff'; c.fillRect(6, 70, 10, 6);
    c.fillStyle = '#f2c230'; c.beginPath(); c.moveTo(8.5, 75); c.lineTo(10.2, 71.5); c.lineTo(11.9, 75); c.fill();
    c.fillStyle = '#d0102c'; c.fillRect(6, 70, 10, 1.2);
    c.fillStyle = '#1b1c1f'; rr(c, 9, 82, 2.4, 14, 0.8); c.fill();
    c.fillStyle = '#b5b8bd'; c.fillRect(1, 76, 1.2, 9);
  }, 5);
}

const builders = {
  switchgear(g) { gis(g); },
  laptop(g) { laptop(g); },
  vrlaptop(g) {
    laptop(g, -0.1);
    const hs = box(0.18, 0.1, 0.1, m('vr', { color: 0x1b1d22, roughness: 0.3, metalness: 0.2 }), 0.17, 0, 0.02);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 24), dark());
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0.17, 0.05, -0.06);
    g.add(hs, strap);
  },
  sensorbox(g) {
    g.add(box(0.3, 0.15, 0.15, dark()));
    g.add(box(0.2, 0.06, 0.004, m('lcd', { color: 0x223, emissive: 0x3a5a7a, emissiveIntensity: 0.7 }), -0.03, 0.06, 0.076));
    for (let i = 0; i < 3; i++) g.add(box(0.012, 0.012, 0.004, green(), 0.1, 0.03 + i * 0.03, 0.076));
  },
  opencase(g) {
    g.add(box(0.6, 0.6, 0.45, white()));
    const caseM = m('case', { color: 0xf2b705, roughness: 0.6 });
    g.add(box(0.7, 0.3, 0.5, caseM, 0, 0.6, 0));
    g.add(box(0.62, 0.02, 0.42, dark(), 0, 0.9, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 0.9, -0.25);
    lid.rotation.x = -0.15;
    lid.add(box(0.7, 0.5, 0.05, caseM, 0, 0, -0.025), box(0.55, 0.32, 0.004, screen(), 0, 0.1, 0.002));
    g.add(lid);
  },
  devices(g, { brand }) {
    const grey = m('relay', { color: 0xd8d9da, roughness: 0.5, metalness: 0.1 });
    const ribs = texMat(ribbedTex('#1d1f23', '#34373d'), { metalness: 0.5, roughness: 0.4 });
    // Large bay controller with LCD + keypad
    g.add(faceBox(0.42, 0.27, 0.26, grey, texMat(bayControllerFront(), { emissive: 0xffffff, emissiveIntensity: 0.08 }), -0.27, 0, 0.0));
    // Touch-screen relay: black ribbed body, white front bezel
    g.add(faceBox(0.26, 0.15, 0.24, ribs, texMat(ribbedTex('#1d1f23', '#34373d')), 0.09, 0, -0.01, ribs));
    g.add(faceBox(0.28, 0.17, 0.02, m('bezel', { color: 0xeeeeee, roughness: 0.4 }), texMat(touchRelayFront(brand), { emissive: 0xffffff, emissiveMap: touchRelayFront(brand), emissiveIntensity: 0.25 }), 0.09, 0, 0.12));
    // Merging unit: white front block + black ribbed rear
    g.add(faceBox(0.22, 0.25, 0.12, m('muFront', { color: 0xeceded, roughness: 0.5 }), texMat(mergingUnitFront(brand)), 0.38, 0, 0.07));
    g.add(faceBox(0.2, 0.23, 0.16, ribs, ribs, 0.38, 0, -0.07, ribs));
  },
  modules(g) {
    g.add(box(0.5, 0.02, 0.4, m('base', { color: 0x5d6b5f, roughness: 0.9 })));
    g.add(box(0.28, 0.12, 0.12, white(), -0.08, 0.02, -0.1));
    g.add(box(0.28, 0.12, 0.12, white(), -0.08, 0.14, -0.1));
    g.add(box(0.14, 0.1, 0.12, light(), 0.15, 0.02, 0.08));
    g.add(box(0.12, 0.08, 0.1, red(), -0.1, 0.02, 0.1));
    for (const x of [0.1, 0.2]) g.add(cyl(0.008, 0.22, steel(), x, 0.02, -0.12, 8));
  },
  transformer(g) {
    g.add(box(0.42, 0.05, 0.2, dark()));
    for (const x of [-0.13, 0, 0.13]) g.add(cyl(0.058, 0.28, m('coil', { color: 0x30405a, roughness: 0.4, metalness: 0.3 }), x, 0.05, 0, 24));
    g.add(box(0.44, 0.05, 0.12, dark(), 0, 0.33, 0));
    for (const x of [-0.13, 0, 0.13]) g.add(cyl(0.012, 0.06, steel(), x, 0.38, 0, 8));
  },
  container(g) {
    g.add(box(0.55, 0.22, 0.24, light()));
    for (let i = -5; i <= 5; i++) g.add(box(0.008, 0.2, 0.004, steel(), i * 0.048, 0.01, 0.122));
    g.add(box(0.55, 0.025, 0.006, red(), 0, 0.17, 0.124));
  },
  'container-hv'(g) { containerSwitchgear(g); },
  cabinet(g, { brand }) {
    const body = m('cab', { color: 0xd7d9dc, roughness: 0.5, metalness: 0.15 });
    g.add(faceBox(0.6, 2.12, 0.8, body, texMat(pqFront(brand), { metalness: 0.1 }), 0, 0.08, 0));
    // plinth with feet
    g.add(box(0.56, 0.06, 0.74, dark(), 0, 0.02, 0));
    for (const x of [-0.25, 0.25]) for (const z of [-0.33, 0.33]) g.add(box(0.08, 0.04, 0.08, body, x, 0, z));
    // vent box on top
    const vent = texMat(ribbedTex('#c9ccd0', '#7f848b', false));
    g.add(faceBox(0.44, 0.08, 0.36, body, vent, 0, 2.2, 0.15));
  },
};

/** Build a model. Returns a THREE.Group, or null for an unknown kind. */
export function buildModel(kind, opts = {}) {
  const fn = builders[kind];
  if (!fn) return null;
  const g = new THREE.Group();
  fn(g, opts);
  return g;
}
