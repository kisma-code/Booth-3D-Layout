// Simple stand-in 3D models for products. Origin = bottom centre, front = +Z.
// Replace with real GLB models later if you have them.
import * as THREE from 'three';

const mats = {};
function m(key, params) {
  if (!mats[key]) mats[key] = new THREE.MeshStandardMaterial(params);
  return mats[key];
}
const light = () => m('light', { color: 0xd9dbdf, roughness: 0.45, metalness: 0.2 });
const dark = () => m('dark', { color: 0x2a2d33, roughness: 0.5, metalness: 0.3 });
const steel = () => m('steel', { color: 0x8c929c, roughness: 0.35, metalness: 0.7 });
const white = () => m('white', { color: 0xf2f2f2, roughness: 0.6 });
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

function laptop(g, x = 0) {
  g.add(box(0.34, 0.018, 0.24, dark(), x, 0, 0));
  const lid = new THREE.Group();
  lid.position.set(x, 0.018, -0.115);
  lid.rotation.x = -0.25;
  const back = box(0.34, 0.22, 0.012, dark(), 0, 0, 0);
  const scr = box(0.31, 0.19, 0.002, screen(), 0, 0.015, 0.007);
  lid.add(back, scr);
  g.add(lid);
}

const builders = {
  switchgear(g) {
    g.add(box(0.8, 0.42, 0.42, light()));
    g.add(box(0.78, 0.02, 0.005, dark(), 0, 0.3, 0.212));
    for (const x of [-0.25, 0, 0.25]) {
      g.add(box(0.2, 0.22, 0.005, m('panel', { color: 0xc6c9ce, roughness: 0.4, metalness: 0.3 }), x, 0.04, 0.212));
      g.add(cyl(0.045, 0.12, dark(), x, 0.42, 0));
    }
  },
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
    lid.add(box(0.7, 0.5, 0.05, caseM, 0, 0, -0.025));
    lid.add(box(0.55, 0.32, 0.004, screen(), 0, 0.1, 0.002));
    g.add(lid);
  },
  devices(g) {
    // Three small protection relays
    const sizes = [[0.3, 0.25, 0.15], [0.45, 0.25, 0.3], [0.25, 0.3, 0.3]];
    let x = -0.53;
    for (const [w, h, d] of sizes) {
      x += w / 2;
      g.add(box(w, h, d, light(), x, 0, 0));
      g.add(box(w * 0.55, h * 0.35, 0.004, screen(), x - w * 0.12, h * 0.5, d / 2 + 0.002));
      for (let i = 0; i < 4; i++) g.add(box(0.012, 0.012, 0.004, green(), x + w * 0.35, h * 0.2 + i * 0.035, d / 2 + 0.002));
      x += w / 2 + 0.03;
    }
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
    for (const x of [-0.15, 0, 0.15]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 12), m('bushing', { color: 0x7a4a3a, roughness: 0.6 }));
      cone.position.set(x, 0.28, 0);
      g.add(cone);
    }
  },
  cabinet(g) {
    g.add(box(0.6, 2.2, 0.8, m('cab', { color: 0xdcdee2, roughness: 0.5, metalness: 0.15 })));
    g.add(box(0.004, 2.0, 0.004, dark(), 0, 0.1, 0.402));
    g.add(box(0.14, 0.09, 0.004, screen(), 0.15, 1.45, 0.402));
    for (let i = 0; i < 6; i++) g.add(box(0.2, 0.01, 0.004, dark(), -0.15, 0.3 + i * 0.03, 0.402));
    g.add(box(0.6, 0.08, 0.8, dark(), 0, 0, 0));
  },
};

/** Build a model. Returns a THREE.Group, or null for an unknown kind. */
export function buildModel(kind) {
  const fn = builders[kind];
  if (!fn) return null;
  const g = new THREE.Group();
  fn(g);
  return g;
}
