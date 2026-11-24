// Builds the booth and the hall around it.
// Plan units are centimetres measured from the top-left corner of the 12 m × 6 m stand
// (x to the right, y down the drawing). World units are metres, booth centre = origin.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import * as TX from './textures.js';
import { buildModel } from './models.js';
import { ANCHORS } from './anchors.js';

export const FLOOR_H = 0.1; // raised booth floor
export const BOOTH = { minX: -6, maxX: 6, minZ: -3, maxZ: 3 };
const P = (x, y) => ({ x: x / 100 - 6, z: y / 100 - 3 });
const Q45 = Math.PI / 4;
const ANCHOR_DEFAULT_MODEL = Object.fromEntries(ANCHORS.filter((a) => a.model).map((a) => [a.id, a.model]));

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function std(params) {
  return new THREE.MeshStandardMaterial({ roughness: 0.6, ...params });
}

export function buildWorld(data, renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15171b);
  scene.fog = new THREE.Fog(0x15171b, 18, 48);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const brand = data.brand?.name || '';
  const zones = data.zones || {};
  const products = data.products || [];
  const anchorProduct = new Map();
  for (const p of products) for (const a of p.anchors || []) if (!anchorProduct.has(a)) anchorProduct.set(a, p);

  const colliders = []; // { type:'rect', cx, cz, hx, hz, rot } | { type:'circle', cx, cz, r }
  const anchors = new Map(); // id -> { object, normalLocal, dist }
  const productMeshes = new Map(); // productId -> Mesh[]
  const clickables = [];

  // ---------- shared materials ----------
  const M = {
    white: std({ color: 0xf1f1f2, roughness: 0.55 }),
    whiteGlow: std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 }),
    red: std({ color: 0xc8001d, roughness: 0.55 }),
    grey: std({ color: 0x8a8e96, roughness: 0.7 }),
    black: std({ color: 0x0d0e10, roughness: 0.35, metalness: 0.3 }),
    steel: std({ color: 0xe9eaec, roughness: 0.3, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xdfeeff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),
    glassDark: new THREE.MeshStandardMaterial({ color: 0x404650, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }),
  };

  // ---------- helpers ----------
  function addRect(cx, cz, w, d, rot = 0) {
    colliders.push({ type: 'rect', cx, cz, hx: w / 2, hz: d / 2, rot });
  }
  function localToWorld(group, lx, lz) {
    const c = Math.cos(group.rotation.y), s = Math.sin(group.rotation.y);
    return { x: group.position.x + lx * c + lz * s, z: group.position.z - lx * s + lz * c };
  }
  function addLocalRect(group, lx, lz, w, d) {
    const p = localToWorld(group, lx, lz);
    addRect(p.x, p.z, w, d, group.rotation.y);
  }
  function makeClickable(obj, product) {
    let list = productMeshes.get(product.id);
    if (!list) productMeshes.set(product.id, (list = []));
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.userData.productId = product.id;
      o.userData.base = {
        emissive: o.material.emissive ? o.material.emissive.clone() : null,
        intensity: o.material.emissiveIntensity,
        opacity: o.material.opacity,
      };
      clickables.push(o);
      list.push(o);
    });
  }
  /** Mark an object as an anchor. If a product uses this anchor, it becomes clickable. */
  function register(id, obj, normalLocal, dist = 1.9) {
    obj.userData.anchor = id;
    anchors.set(id, { object: obj, normalLocal, dist });
    const p = anchorProduct.get(id);
    if (p) makeClickable(obj, p);
  }
  function tv(id, inch, group, x, y, side) {
    const [w, h] = inch === 50 ? [1.11, 0.62] : [0.93, 0.52];
    const p = anchorProduct.get(id);
    const t = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.045), M.black);
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      std({ color: 0x000000, emissive: 0xffffff, emissiveMap: TX.screenTexture(p?.nameEn, p?.nameZh, brand), emissiveIntensity: 0.75, roughness: 0.25 })
    );
    scr.position.z = 0.0231;
    t.add(frame, scr);
    t.position.set(x, y, side * (0.3 + 0.0225));
    if (side < 0) t.rotation.y = Math.PI;
    group.add(t);
    register(id, t, new THREE.Vector3(0, 0, side), 2.0);
    return t;
  }
  function model(id, group, x, y, z, rotY, normalLocal, dist = 1.6) {
    const p = anchorProduct.get(id);
    if (!p) return null;
    const obj = buildModel(p.model || ANCHOR_DEFAULT_MODEL[id]);
    if (!obj) return null;
    obj.position.set(x, y, z);
    obj.rotation.y = rotY;
    group.add(obj);
    register(id, obj, normalLocal, dist);
    return obj;
  }
  function captionsFor(face, faceLenCm) {
    const used = new Set();
    const title = norm(zones[face.zone]?.title);
    const out = [];
    for (const slot of face.captions || []) {
      const p = anchorProduct.get(slot.anchor);
      if (!p || used.has(p.id)) continue;
      used.add(p.id);
      const n = norm(p.nameEn);
      if (title && (n.startsWith(title) || title.startsWith(n))) continue;
      out.push({ xCm: slot.x, wCm: slot.w, yCm: slot.y, size: slot.size, en: p.nameEn, zh: p.nameZh });
    }
    return out;
  }
  function faceTexture(face, lenCm) {
    const z = zones[face.zone] || {};
    return TX.wallTexture({
      wCm: lenCm,
      hCm: 250,
      style: face.style,
      seed: face.seed,
      title: z.title,
      subtitle: z.subtitle,
      titleY: face.titleY,
      titleSize: face.titleSize,
      captions: captionsFor(face, lenCm),
      brand: face.brand ? { text: brand, ...face.brand } : null,
      diagram: face.diagram ? { rows: z.rows || [] } : null,
    });
  }

  /** Display wall: 60 cm thick, 250 cm body + 15 cm light header, on the raised floor. */
  function wall(spec) {
    const g = new THREE.Group();
    const c = P(...spec.center);
    g.position.set(c.x, 0, c.z);
    g.rotation.y = Q45;
    const L = spec.len / 100;
    const end = M.red;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, 2.5, 0.6), [
      end, end, M.white, M.white,
      std({ map: faceTexture(spec.front, spec.len) }),
      std({ map: faceTexture(spec.back, spec.len) }),
    ]);
    body.position.y = FLOOR_H + 1.25;
    const header = new THREE.Mesh(new THREE.BoxGeometry(L, 0.15, 0.6), [M.white, M.white, M.white, M.whiteGlow, M.whiteGlow, M.whiteGlow]);
    header.position.y = FLOOR_H + 2.575;
    g.add(body, header);
    addRect(c.x, c.z, L, 0.6, Q45);
    spec.build(g, L);
    scene.add(g);
    return g;
  }

  // ---------- Wall A (200 cm) – drawing p.8 ----------
  wall({
    center: [1010.2, 458.8],
    len: 200,
    front: { zone: 'A_front', style: 'red', seed: 2, titleY: 9, titleSize: 9, captions: [{ anchor: 'A_front_cabinet', x: 20, w: 160, y: 22, size: 4 }, { anchor: 'A_front_tv', x: 20, w: 160, y: 22, size: 4 }] },
    back: { zone: 'A_back', style: 'red', seed: 5, titleY: 14, titleSize: 10, captions: [{ anchor: 'A_back_tv', x: 20, w: 160, y: 34, size: 4 }] },
    build(g) {
      tv('A_front_tv', 42, g, -0.495, FLOOR_H + 1.66, 1);
      tv('A_back_tv', 42, g, 0.005, FLOOR_H + 1.66, -1);
      // Cabinet A 115 × 70 × 67 with glass case 100 × 50 × 50 on top
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.67, 0.7), M.white);
      cab.position.set(0.425, FLOOR_H + 0.335, 0.65);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.6), M.glass);
      glass.position.set(0.425, FLOOR_H + 0.67 + 0.275, 0.65);
      g.add(cab, glass);
      addLocalRect(g, 0.425, 0.65, 1.15, 0.7);
      model('A_front_cabinet', g, 0.425, FLOOR_H + 0.67, 0.65, 0, new THREE.Vector3(0, 0, 1), 1.8);
    },
  });

  // ---------- Wall B (350 cm) – drawings p.9, p.10 ----------
  wall({
    center: [635, 459],
    len: 350,
    front: {
      zone: 'B_front', style: 'red', seed: 9, titleY: 10, titleSize: 10,
      captions: [
        { anchor: 'B_front_tv1', x: 11, w: 108, y: 26, size: 3.6 },
        { anchor: 'B_front_tv2', x: 126, w: 108, y: 26, size: 3.6 },
        { anchor: 'B_front_glass', x: 250, w: 100, y: 26, size: 3.6 },
        { anchor: 'B_front_shelf', x: 126, w: 108, y: 26, size: 3.6 },
        { anchor: 'B_front_cabinet', x: 30, w: 130, y: 128, size: 3.8 },
      ],
    },
    back: {
      zone: 'B_back', style: 'white', titleY: 8, titleSize: 9, diagram: true,
      captions: [
        { anchor: 'B_back_tv1', x: 41, w: 93, y: 34, size: 3.2 },
        { anchor: 'B_back_tv2', x: 216, w: 93, y: 34, size: 3.2 },
      ],
    },
    build(g, L) {
      tv('B_front_tv1', 50, g, -1.75 + 0.65, FLOOR_H + 1.71, 1);
      tv('B_front_tv2', 50, g, -1.75 + 1.8, FLOOR_H + 1.71, 1);
      tv('B_back_tv1', 42, g, 0.875, FLOOR_H + 1.76, -1);
      tv('B_back_tv2', 42, g, -0.875, FLOOR_H + 1.76, -1);
      // Cabinet B 75 × 75 × 75
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), M.white);
      cab.position.set(-0.745, FLOOR_H + 0.375, 0.3 + 0.375);
      g.add(cab);
      addLocalRect(g, -0.745, 0.675, 0.75, 0.75);
      model('B_front_cabinet', g, -0.745, FLOOR_H + 0.75, 0.675, 0, new THREE.Vector3(0, 0, 1));
      // Front shelf (laptop) at 97 cm
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.32), M.white);
      shelf.position.set(0.328, FLOOR_H + 0.95, 0.3 + 0.16);
      g.add(shelf);
      model('B_front_shelf', g, 0.328, FLOOR_H + 0.97, 0.47, 0, new THREE.Vector3(0, 0, 1), 1.4);
      // Tall glass case 90 × 165
      const gc = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.65, 0.6), M.glassDark);
      gc.position.set(1.3, FLOOR_H + 0.825, 0.3 + 0.3);
      g.add(gc);
      addLocalRect(g, 1.3, 0.6, 0.9, 0.6);
      model('B_front_glass', g, 1.3, FLOOR_H, 0.6, 0, new THREE.Vector3(0, 0, 1), 2.0);
      // Back shelf at 80 cm
      const bshelf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.35), M.white);
      bshelf.position.set(1.25, FLOOR_H + 0.78, -0.3 - 0.175);
      g.add(bshelf);
      model('B_back_shelf', g, 1.25, FLOOR_H + 0.8, -0.47, Math.PI, new THREE.Vector3(0, 0, -1), 1.6);
      // Whole back graphic as a click target
      if (anchorProduct.get('B_back_panel')) {
        const hit = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
        hit.position.set(0, FLOOR_H + 1.25, -0.302);
        hit.rotation.y = Math.PI;
        g.add(hit);
        register('B_back_panel', hit, new THREE.Vector3(0, 0, -1), 2.8);
      }
    },
  });

  // ---------- Wall C (320 cm) – drawing p.11 ----------
  wall({
    center: [497.3, 153.7],
    len: 320,
    front: {
      zone: 'C_front', style: 'red', seed: 4, titleY: 10, titleSize: 10,
      captions: [
        { anchor: 'C_front_tv1', x: 9.5, w: 93, y: 25, size: 3.3 },
        { anchor: 'C_front_tv2', x: 113.5, w: 93, y: 25, size: 3.3 },
        { anchor: 'C_front_tv3', x: 217.7, w: 93, y: 25, size: 3.3 },
        { anchor: 'C_front_cabinet1', x: 140, w: 60, y: 108, size: 3.2 },
        { anchor: 'C_front_cabinet2', x: 200, w: 60, y: 108, size: 3.2 },
        { anchor: 'C_front_cabinet3', x: 260, w: 60, y: 108, size: 3.2 },
      ],
    },
    back: {
      zone: 'C_back', style: 'red', seed: 6, titleY: 12, titleSize: 10,
      captions: [
        { anchor: 'C_back_tv1', x: 19, w: 93, y: 30, size: 3.4 },
        { anchor: 'C_back_tv2', x: 137, w: 93, y: 30, size: 3.4 },
        { anchor: 'C_back_shelf', x: 19, w: 93, y: 30, size: 3.4 },
        { anchor: 'C_back_floor', x: 220, w: 95, y: 30, size: 3.4 },
      ],
    },
    build(g) {
      tv('C_front_tv1', 42, g, -1.04, FLOOR_H + 1.76, 1);
      tv('C_front_tv2', 42, g, 0.0, FLOOR_H + 1.76, 1);
      tv('C_front_tv3', 42, g, 1.042, FLOOR_H + 1.76, 1);
      tv('C_back_tv1', 42, g, 0.945, FLOOR_H + 1.66, -1);
      tv('C_back_tv2', 42, g, -0.235, FLOOR_H + 1.66, -1);
      // Cabinet C 180 × 90 × 90 with three product slots
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.88, 0.9), M.white);
      cab.position.set(0.7, FLOOR_H + 0.46, 0.3 + 0.45);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.02, 0.88), M.whiteGlow);
      strip.position.set(0.7, FLOOR_H + 0.01, 0.75);
      g.add(cab, strip);
      addLocalRect(g, 0.7, 0.75, 1.8, 0.9);
      const top = FLOOR_H + 0.9;
      model('C_front_cabinet1', g, 0.15, top, 0.75, 0, new THREE.Vector3(0, 0, 1));
      model('C_front_cabinet2', g, 0.7, top, 0.75, 0, new THREE.Vector3(0, 0, 1));
      model('C_front_cabinet3', g, 1.25, top, 0.75, 0, new THREE.Vector3(0, 0, 1));
      // Back shelf 50 × 30 at 80 cm
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.3), M.white);
      shelf.position.set(0.94, FLOOR_H + 0.78, -0.45);
      g.add(shelf);
      model('C_back_shelf', g, 0.94, FLOOR_H + 0.8, -0.45, Math.PI, new THREE.Vector3(0, 0, -1), 1.4);
      // Floor unit (80 deep × 60 wide × 220 high) at the back, right end
      const fu = model('C_back_floor', g, -1.25, FLOOR_H, -0.7, Math.PI, new THREE.Vector3(0, 0, -1), 2.2);
      if (fu) addLocalRect(g, -1.25, -0.7, 0.6, 0.8);
    },
  });

  // ---------- Storage room + sign board B – drawings p.5, p.6 ----------
  {
    const c = P(75, 295);
    const front = TX.wallTexture({ wCm: 590, hCm: 240, style: 'red', seed: 12, brand: { text: brand, xCm: 20, yCm: 20, sizeCm: 70, maxW: 330 } });
    const endTop = TX.wallTexture({ wCm: 150, hCm: 240, style: 'red', seed: 13 });
    const endDoor = TX.wallTexture({ wCm: 150, hCm: 240, style: 'red', seed: 14, door: { xCm: 10, wCm: 90, hCm: 200 } });
    const room = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 5.9), [
      std({ map: front }), M.grey, M.white, M.white, std({ map: endDoor }), std({ map: endTop }),
    ]);
    room.position.set(c.x, FLOOR_H + 1.2, c.z);
    scene.add(room);
    addRect(c.x, c.z, 1.5, 6.0);

    const circuitFront = TX.wallTexture({
      wCm: 606, hCm: 150, style: 'circuit', seed: 21,
      brand: { text: brand, xCm: 30, yCm: 28, sizeCm: 42, maxW: 260, lines: [data.brand?.company, data.brand?.tagline].filter(Boolean) },
    });
    const circuitPlain = TX.wallTexture({ wCm: 606, hCm: 150, style: 'circuit', seed: 22 });
    const a = { x: -6 + 0.06, z: 2.9 }, b = { x: -4.5, z: -3 + 0.06 };
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const board = new THREE.Mesh(new THREE.BoxGeometry(len, 1.5, 0.08), [
      M.white, M.white, M.white, M.white, std({ map: circuitFront, emissive: 0xffffff, emissiveMap: circuitFront, emissiveIntensity: 0.25 }), std({ map: circuitPlain }),
    ]);
    board.position.set((a.x + b.x) / 2, FLOOR_H + 2.4 + 0.75, (a.z + b.z) / 2);
    board.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x);
    scene.add(board);
    const endTex = TX.wallTexture({ wCm: 150, hCm: 150, style: 'circuit', seed: 23 });
    const endBoard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.08), [
      M.white, M.white, M.white, M.white, std({ map: endTex }), std({ map: endTex, emissive: 0xffffff, emissiveMap: endTex, emissiveIntensity: 0.25 }),
    ]);
    endBoard.position.set(-5.25, FLOOR_H + 2.4 + 0.75, -3 + 0.04);
    scene.add(endBoard);
  }

  // ---------- LED video wall room – drawing p.7 ----------
  {
    const x0 = 7.75 - 6, x1 = 6, z0 = -3, z1 = -1.4;
    const side = TX.wallTexture({ wCm: 160, hCm: 250, style: 'white' });
    const back = TX.wallTexture({ wCm: 425, hCm: 250, style: 'white', door: { xCm: 8, wCm: 90, hCm: 200 } });
    const room = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 2.5, z1 - z0), [
      std({ map: side }), std({ map: side }), M.grey, M.white, M.white, std({ map: back }),
    ]);
    room.position.set((x0 + x1) / 2, FLOOR_H + 1.25, (z0 + z1) / 2);
    scene.add(room);
    addRect((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0);
    const city = TX.cityTexture();
    const led = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.5), std({ color: 0x000000, emissive: 0xffffff, emissiveMap: city, emissiveIntensity: 1.0, roughness: 0.4 }));
    led.position.set(x0 + 0.13 + 2.0, FLOOR_H + 1.25, z1 + 0.006);
    scene.add(led);
    register('LED_wall', led, new THREE.Vector3(0, 0, 1), 4.0);
  }

  // ---------- Reception counter – drawing p.12 ----------
  {
    const c = P(318, 546);
    const g = new THREE.Group();
    g.position.set(c.x, 0, c.z);
    g.rotation.y = Q45;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.5), [
      M.white, M.white, M.white, M.white, std({ map: TX.counterTexture(brand), roughness: 0.4 }), M.white,
    ]);
    counter.position.y = FLOOR_H + 0.5;
    g.add(counter);
    scene.add(g);
    addRect(c.x, c.z, 1.0, 0.5, Q45);
    register('counter', counter, new THREE.Vector3(0, 0, 1), 2.0);
  }

  // ---------- Meeting area: 3 tables, 12 chairs ----------
  {
    const tableTop = new THREE.CylinderGeometry(0.35, 0.35, 0.03, 32);
    const stem = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 12);
    const foot = new THREE.CylinderGeometry(0.24, 0.26, 0.02, 24);
    for (const ty of [67, 239, 400]) {
      const t = P(228, ty);
      const g = new THREE.Group();
      g.position.set(t.x, FLOOR_H, t.z);
      const top = new THREE.Mesh(tableTop, M.white);
      top.position.y = 0.72;
      const s = new THREE.Mesh(stem, M.steel);
      s.position.y = 0.36;
      const f = new THREE.Mesh(foot, M.white);
      f.position.y = 0.01;
      g.add(top, s, f);
      scene.add(g);
      colliders.push({ type: 'circle', cx: t.x, cz: t.z, r: 0.36 });
      for (const [dx, dz] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]]) {
        const ch = chair();
        ch.position.set(t.x + dx, FLOOR_H, t.z + dz);
        ch.rotation.y = Math.atan2(-dx, -dz);
        scene.add(ch);
        colliders.push({ type: 'circle', cx: t.x + dx, cz: t.z + dz, r: 0.22 });
      }
    }
  }
  function chair() {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.4), M.white);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.03), M.white);
    back.position.set(0, 0.66, -0.2);
    back.rotation.x = -0.12;
    g.add(seat, back);
    const leg = new THREE.CylinderGeometry(0.01, 0.01, 0.45, 6);
    for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) {
      const l = new THREE.Mesh(leg, M.steel);
      l.position.set(x, 0.225, z);
      g.add(l);
    }
    return g;
  }

  // ---------- Ring sign Ø600 × 120 – drawing p.4 ----------
  {
    const c = P(760, 300);
    const g = new THREE.Group();
    g.position.set(c.x, 3.9, c.z);
    const tex = TX.ringTexture(brand);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 1.2, 128, 1, true), std({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.5 }));
    outer.rotation.y = -Math.PI / 2;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.2, 128, 1, true), std({ color: 0xc4001c, side: THREE.BackSide, roughness: 0.6 }));
    const rim = new THREE.RingGeometry(2.8, 3.0, 128);
    const topRim = new THREE.Mesh(rim, std({ color: 0x55585e, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 }));
    topRim.rotation.x = -Math.PI / 2;
    topRim.position.y = 0.6;
    const botRim = topRim.clone();
    botRim.position.y = -0.6;
    g.add(outer, inner, topRim, botRim);
    scene.add(g);
    // Ø8 white columns
    const colGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.4, 12);
    for (const [x, y] of [[554.6, 96.4], [574.6, 519.5], [866.3, 28.3], [986.9, 482.1]]) {
      const p = P(x, y);
      const col = new THREE.Mesh(colGeo, M.white);
      col.position.set(p.x, FLOOR_H + 2.2, p.z);
      scene.add(col);
    }
  }

  // ---------- Raised floor with LED edge ----------
  {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, FLOOR_H, 6), std({ color: 0xf2f2f3, roughness: 0.35 }));
    floor.position.y = FLOOR_H / 2;
    scene.add(floor);
    const edges = [
      [12, 0.012, 0, 3.006], // aisle side (bottom)
      [0.012, 6, 6.006, 0], // aisle side (right)
      [6.25, 0.012, -1.375, -3.006], // aisle side (top), up to LED room
    ];
    for (const [w, d, x, z] of edges) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), M.whiteGlow);
      e.position.set(x, 0.05, z);
      scene.add(e);
    }
  }

  // ---------- Hall ----------
  {
    const hall = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), std({ color: 0x33363b, roughness: 0.28, metalness: 0.1 }));
    hall.rotation.x = -Math.PI / 2;
    scene.add(hall);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), std({ color: 0x23262b, roughness: 0.9 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 12;
    scene.add(ceil);
    const lampGeo = new THREE.BoxGeometry(1.2, 0.05, 0.3);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const positions = [];
    for (let x = -36; x <= 36; x += 4.5) for (let z = -26; z <= 26; z += 4.5) positions.push([x, z]);
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, positions.length);
    const mtx = new THREE.Matrix4();
    positions.forEach(([x, z], i) => lamps.setMatrixAt(i, mtx.makeTranslation(x, 11.9, z)));
    scene.add(lamps);

    // Generic neighbour stands (no branding) for context.
    const neighbours = [
      [-12, -6, -3, 3], [9, 16, -3, 3],
      [-10, 1.5, -12, -6], [3.5, 14, -12, -6],
      [-10, 1.5, 6, 12], [3.5, 14, 6, 12],
    ];
    const nMat = std({ color: 0x9da2aa, roughness: 0.7 });
    const nFloor = std({ color: 0x6d7178, roughness: 0.6 });
    for (const [xa, xb, za, zb] of neighbours) {
      const w = xb - xa, d = zb - za, cx = (xa + xb) / 2, cz = (za + zb) / 2;
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), nFloor);
      f.position.set(cx, 0.025, cz);
      scene.add(f);
      const bw = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 2.5, 0.2), nMat);
      bw.position.set(cx, 1.25, cz + (cz > 0 ? d / 2 - 0.3 : -d / 2 + 0.3));
      scene.add(bw);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.6), nMat);
      box.position.set(cx - w * 0.15, 0.5, cz);
      scene.add(box);
      addRect(cx, cz, w, d);
    }
  }

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3d44, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(4, 12, 7);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-6, 9, -5);
  scene.add(fill);
  for (const [x, z] of [[-3, 0], [1.6, 0], [4, 1.5], [-1, -1.5]]) {
    const pl = new THREE.PointLight(0xffffff, 6, 7, 1.6);
    pl.position.set(x, 3.4, z);
    scene.add(pl);
  }

  // ---------- Anchor positions + markers ----------
  scene.updateMatrixWorld(true);
  const anchorInfo = new Map();
  const q = new THREE.Quaternion();
  for (const [id, a] of anchors) {
    const box = new THREE.Box3().setFromObject(a.object);
    const center = box.getCenter(new THREE.Vector3());
    a.object.parent.getWorldQuaternion(q);
    const normal = a.normalLocal.clone().applyQuaternion(q);
    normal.y = 0;
    normal.normalize();
    anchorInfo.set(id, { center, top: box.max.y, normal, dist: a.dist });
  }

  const markers = [];
  const markerMat = new THREE.SpriteMaterial({ map: TX.markerTexture(), depthTest: true, transparent: true });
  for (const p of products) {
    const first = (p.anchors || []).find((id) => anchorInfo.has(id) && productMeshes.has(p.id));
    if (!first) continue;
    const info = anchorInfo.get(first);
    const s = new THREE.Sprite(markerMat);
    s.scale.setScalar(0.17);
    // Full-wall graphic: put the marker in the gap between the two TVs.
    const y = first === 'B_back_panel' ? FLOOR_H + 1.76 : Math.min(info.top + 0.12, 2.55);
    s.position.set(info.center.x + info.normal.x * 0.08, y, info.center.z + info.normal.z * 0.08);
    s.userData.productId = p.id;
    s.userData.baseY = y;
    scene.add(s);
    markers.push(s);
    clickables.push(s);
  }

  /** Where to stand to look at a product. */
  function viewpointFor(productId) {
    const p = products.find((x) => x.id === productId);
    const id = (p?.anchors || []).find((a) => anchorInfo.has(a));
    if (!id) return null;
    const info = anchorInfo.get(id);
    return {
      x: info.center.x + info.normal.x * info.dist,
      z: info.center.z + info.normal.z * info.dist,
      lookAt: info.center.clone(),
    };
  }

  function update(t) {
    for (let i = 0; i < markers.length; i++) markers[i].position.y = markers[i].userData.baseY + Math.sin(t * 2 + i) * 0.03;
  }

  return {
    scene,
    clickables,
    colliders,
    productMeshes,
    viewpointFor,
    update,
    bounds: { minX: -11, maxX: 8.6, minZ: -5.7, maxZ: 5.7 },
    floorHeightAt: (x, z) => (x > BOOTH.minX && x < BOOTH.maxX && z > BOOTH.minZ && z < BOOTH.maxZ ? FLOOR_H : 0),
  };
}
