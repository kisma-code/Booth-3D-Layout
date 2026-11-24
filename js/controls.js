// First-person walk controls: keyboard + mouse (pointer lock or drag), touch joystick + drag.
import * as THREE from 'three';

const EYE = 1.6;
const RADIUS = 0.3;
const WALK = 2.0;
const RUN = 3.8;

export class FPSControls {
  constructor({ camera, dom, world, joystick, isTouch }) {
    this.camera = camera;
    this.dom = dom;
    this.world = world;
    this.isTouch = isTouch;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.eyeY = EYE;
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this.locked = false;
    this.fallback = false; // drag-to-look when pointer lock is not available
    this.enabled = false;
    this.onLockChange = () => {};
    this.onSelectAt = () => {}; // (clientX, clientY) or null for screen centre
    this.mouse = { x: 0, y: 0, inside: false };

    camera.rotation.order = 'YXZ';
    this._bindKeyboard();
    if (isTouch) this._bindTouch(joystick);
    else this._bindMouse();
  }

  // ---------- pose ----------
  setPose(x, z, yaw, pitch = 0) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = pitch;
    this._resolve();
    this.eyeY = this.world.floorHeightAt(this.pos.x, this.pos.z) + EYE;
    this._apply();
  }
  lookAtPoint(p) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    this.yaw = Math.atan2(-dx, -dz);
    const dist = Math.hypot(dx, dz);
    this.pitch = THREE.MathUtils.clamp(Math.atan2(p.y - this.eyeY, dist), -0.6, 0.6);
    this._apply();
  }

  // ---------- pointer lock ----------
  lock() {
    if (this.isTouch) return;
    if (this.fallback || !this.dom.requestPointerLock) {
      this.fallback = true;
      this.onLockChange(false);
      return;
    }
    try {
      const r = this.dom.requestPointerLock();
      if (r && r.catch) r.catch(() => this._useFallback());
    } catch {
      this._useFallback();
    }
  }
  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
  _useFallback() {
    this.fallback = true;
    this.onLockChange(false);
  }

  // ---------- input ----------
  _bindKeyboard() {
    const typing = (e) => /input|textarea|select/i.test(e.target?.tagName || '');
    addEventListener('keydown', (e) => {
      if (typing(e)) return;
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  _bindMouse() {
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      this.onLockChange(this.locked);
    });
    document.addEventListener('pointerlockerror', () => this._useFallback());

    let drag = null;
    this.dom.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (this.locked) {
        if (e.button === 0) this.onSelectAt(null);
        return;
      }
      if (this.fallback) drag = { x: e.clientX, y: e.clientY, moved: 0 };
    });
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.inside = e.target === this.dom;
      if (!this.enabled) return;
      if (this.locked) {
        this._turn(e.movementX * 0.0022, e.movementY * 0.0022);
      } else if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        drag.x = e.clientX;
        drag.y = e.clientY;
        this._turn(dx * 0.004, dy * 0.004);
      }
    });
    addEventListener('mouseup', (e) => {
      if (drag && drag.moved < 6 && e.target === this.dom) this.onSelectAt(e.clientX, e.clientY);
      drag = null;
    });
  }

  _bindTouch(joystick) {
    const base = joystick, knob = joystick.querySelector('.knob');
    let joyId = null, joyCenter = null;
    const look = new Map(); // touch id -> {x, y, t, moved}
    const R = 46;

    const setKnob = (dx, dy) => {
      const len = Math.hypot(dx, dy), k = len > R ? R / len : 1;
      dx *= k; dy *= k;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R;
      this.joy.y = dy / R;
    };

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyId = t.identifier;
      const r = base.getBoundingClientRect();
      joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      setKnob(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
    }, { passive: false });

    this.dom.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      for (const t of e.changedTouches) look.set(t.identifier, { x: t.clientX, y: t.clientY, t: performance.now(), moved: 0 });
    }, { passive: false });

    addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          setKnob(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
        } else if (look.has(t.identifier)) {
          const l = look.get(t.identifier);
          const dx = t.clientX - l.x, dy = t.clientY - l.y;
          l.moved += Math.abs(dx) + Math.abs(dy);
          l.x = t.clientX;
          l.y = t.clientY;
          this._turn(dx * 0.006, dy * 0.006);
        }
      }
    }, { passive: true });

    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null;
          setKnob(0, 0);
        } else if (look.has(t.identifier)) {
          const l = look.get(t.identifier);
          if (l.moved < 10 && performance.now() - l.t < 350) this.onSelectAt(t.clientX, t.clientY);
          look.delete(t.identifier);
        }
      }
    };
    addEventListener('touchend', end);
    addEventListener('touchcancel', end);
  }

  _turn(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.35, 1.35);
  }

  // ---------- simulation ----------
  update(dt) {
    if (this.enabled) {
      let f = 0, s = 0;
      const k = this.keys;
      if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
      if (k.has('KeyA')) s -= 1;
      if (k.has('KeyD')) s += 1;
      if (k.has('ArrowLeft')) this.yaw += 1.8 * dt;
      if (k.has('ArrowRight')) this.yaw -= 1.8 * dt;
      f -= this.joy.y;
      s += this.joy.x;
      const len = Math.hypot(f, s);
      if (len > 1) { f /= len; s /= len; }
      if (len > 0.02) {
        const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK) * dt;
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        this.pos.x += (-sin * f + cos * s) * speed;
        this.pos.z += (-cos * f - sin * s) * speed;
        this._resolve();
      }
    }
    const target = this.world.floorHeightAt(this.pos.x, this.pos.z) + EYE;
    this.eyeY += (target - this.eyeY) * Math.min(1, dt * 12);
    this._apply();
  }

  _apply() {
    this.camera.position.set(this.pos.x, this.eyeY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** Push the player out of every collider. */
  _resolve() {
    const p = this.pos;
    for (let pass = 0; pass < 3; pass++) {
      for (const c of this.world.colliders) {
        if (c.type === 'circle') {
          const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz), min = c.r + RADIUS;
          if (d < min) {
            const k = d > 1e-6 ? min / d : 1;
            p.x = c.cx + (d > 1e-6 ? dx * k : min);
            p.z = c.cz + (d > 1e-6 ? dz * k : 0);
          }
          continue;
        }
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
        const dx = p.x - c.cx, dz = p.z - c.cz;
        let lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        const qx = THREE.MathUtils.clamp(lx, -c.hx, c.hx), qz = THREE.MathUtils.clamp(lz, -c.hz, c.hz);
        let ox = lx - qx, oz = lz - qz;
        const d = Math.hypot(ox, oz);
        if (d >= RADIUS) continue;
        if (d > 1e-6) {
          lx = qx + (ox / d) * RADIUS;
          lz = qz + (oz / d) * RADIUS;
        } else {
          // Inside the box: leave by the nearest side.
          const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
          if (px < pz) lx = Math.sign(lx || 1) * (c.hx + RADIUS);
          else lz = Math.sign(lz || 1) * (c.hz + RADIUS);
        }
        p.x = c.cx + lx * cs + lz * sn;
        p.z = c.cz - lx * sn + lz * cs;
      }
      const b = this.world.bounds;
      p.x = THREE.MathUtils.clamp(p.x, b.minX, b.maxX);
      p.z = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
    }
  }
}
