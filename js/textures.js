// Canvas-painted textures for wall graphics, screens and signs.
// All text comes from the (decrypted) booth data, never from this file.
import * as THREE from 'three';

export const FONT = '"Helvetica Neue", Helvetica, Arial, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
export const BRAND_RED = '#e60027';

const MAX_TEX = 4096;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Canvas sized in centimetres. Drawing units are cm. */
function makeCanvas(wCm, hCm, pxPerCm = 4) {
  const px = Math.min(pxPerCm, MAX_TEX / Math.max(wCm, hCm));
  const c = document.createElement('canvas');
  c.width = Math.round(wCm * px);
  c.height = Math.round(hCm * px);
  const ctx = c.getContext('2d');
  ctx.scale(c.width / wCm, c.height / hCm);
  return { c, ctx, w: wCm, h: hCm };
}

export function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function setFont(ctx, size, weight = '600') {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function fitFont(ctx, text, maxW, size, weight = '600') {
  let s = size;
  for (let i = 0; i < 40; i++) {
    setFont(ctx, s, weight);
    if (ctx.measureText(text).width <= maxW) break;
    s *= 0.93;
  }
  return s;
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    // Split on spaces for Latin text; CJK text without spaces is split per character.
    const tokens = /\s/.test(para) ? para.split(/(\s+)/) : Array.from(para);
    let line = '';
    for (const tok of tokens) {
      const test = line + tok;
      if (ctx.measureText(test).width > maxW && line.trim()) {
        out.push(line.trim());
        line = tok.trimStart();
      } else line = test;
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}

/** Draw lines centred at x. Returns the y after the last line. */
function textBlock(ctx, text, x, y, maxW, size, color, weight = '500', gap = 1.25, align = 'center') {
  setFont(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  for (const ln of wrap(ctx, text, maxW)) {
    ctx.fillText(ln, x, y);
    y += size * gap;
  }
  return y;
}

// ---------- backgrounds ----------

function paintRed(ctx, w, h, seed = 1) {
  const r = rng(seed);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#a9001b');
  g.addColorStop(0.45, '#df0020');
  g.addColorStop(1, '#9a0017');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Large soft swooshes, like the booth artwork.
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#6e0010';
  ctx.beginPath();
  const a = 0.45 + r() * 0.2;
  ctx.moveTo(0, h * a);
  ctx.bezierCurveTo(w * 0.35, h * (a - 0.25), w * 0.55, h * 1.05, w, h * (0.55 + r() * 0.2));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ff5a68';
  ctx.beginPath();
  const b = 0.25 + r() * 0.3;
  ctx.moveTo(w * b, 0);
  ctx.bezierCurveTo(w * (b + 0.15), h * 0.45, w * (b + 0.4), h * 0.3, w * (b + 0.55), h);
  ctx.lineTo(w, h);
  ctx.lineTo(w, 0);
  ctx.fill();
  ctx.restore();
}

function paintWhite(ctx, w, h) {
  ctx.fillStyle = '#f6f6f7';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, h, w * 0.45, h * 0.35);
  g.addColorStop(0, 'rgba(232,40,80,0.55)');
  g.addColorStop(1, 'rgba(232,40,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.25);
  ctx.bezierCurveTo(w * 0.2, h * 0.55, w * 0.25, h * 0.9, w * 0.5, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function paintCircuit(ctx, w, h, seed = 7) {
  const r = rng(seed);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#06173a');
  g.addColorStop(0.6, '#0b3576');
  g.addColorStop(1, '#0a2050');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    let x = r() * w, y = r() * h;
    ctx.strokeStyle = r() < 0.75 ? `rgba(90,170,255,${0.25 + r() * 0.4})` : `rgba(255,120,80,${0.3 + r() * 0.4})`;
    ctx.lineWidth = 0.25 + r() * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      if (r() < 0.5) x += (r() - 0.5) * w * 0.25; else y += (r() - 0.5) * h * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + r() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glow dots
  for (let i = 0; i < 60; i++) {
    const x = r() * w, y = r() * h, rad = 1 + r() * 3;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, 'rgba(255,170,140,0.9)');
    rg.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Chip
  const cw = Math.min(w, h) * 0.32, cx = w * 0.72, cy = h * 0.32;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(-cw / 2, -cw / 2, cw, cw);
  ctx.strokeStyle = 'rgba(160,200,255,0.6)';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-cw / 2 + 2, -cw / 2 + 2, cw - 4, cw - 4);
  ctx.restore();
}

function paintCity(ctx, w, h, seed = 3) {
  const r = rng(seed);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#2a3566');
  sky.addColorStop(0.6, '#6a6fa8');
  sky.addColorStop(1, '#c79bb0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const horizon = h * 0.58;
  // Buildings
  for (let layer = 0; layer < 2; layer++) {
    let x = -5;
    while (x < w) {
      const bw = 8 + r() * (layer ? 22 : 14);
      const bh = (layer ? 40 : 20) + r() * (layer ? 110 : 60);
      const top = horizon - bh;
      ctx.fillStyle = layer ? '#141a33' : '#2a2f52';
      ctx.fillRect(x, top, bw, bh);
      for (let wy = top + 3; wy < horizon - 2; wy += 3.2) {
        for (let wx = x + 1.5; wx < x + bw - 1.5; wx += 2.6) {
          if (r() < (layer ? 0.55 : 0.3)) {
            ctx.fillStyle = r() < 0.8 ? `rgba(255,214,150,${0.6 + r() * 0.4})` : 'rgba(180,220,255,0.8)';
            ctx.fillRect(wx, wy, 1.3, 1.6);
          }
        }
      }
      x += bw + r() * (layer ? 14 : 4);
    }
  }
  // Water
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, '#1d2140');
  water.addColorStop(1, '#0a0c1a');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 260; i++) {
    const x = r() * w, y = horizon + r() * (h - horizon);
    ctx.fillStyle = `rgba(255,${180 + r() * 60},${100 + r() * 80},${0.15 + r() * 0.35})`;
    ctx.fillRect(x, y, 0.6 + r() * 1.2, 4 + r() * 10);
  }
  // Light trails
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const y0 = horizon + 10 + r() * (h - horizon - 15);
    ctx.strokeStyle = r() < 0.5 ? 'rgba(255,90,60,0.55)' : 'rgba(255,230,150,0.55)';
    ctx.lineWidth = 0.6 + r() * 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, y0 + 20);
    ctx.bezierCurveTo(w * 0.3, y0 - 10, w * 0.6, y0 + 25, w + 10, y0 - 15 + r() * 20);
    ctx.stroke();
  }
  // LED module grid
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.15;
  for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

// ---------- public builders ----------

/**
 * Printed wall face.
 * opts: { wCm, hCm, style: 'red'|'white'|'circuit', title, subtitle, titleY, titleSize,
 *         captions: [{ xCm, wCm, yCm, en, zh }], brand: { text, xCm, yCm, sizeCm, align, color },
 *         diagram: { rows }, door: { xCm, wCm, hCm }, seed }
 */
export function wallTexture(opts) {
  const { wCm: w, hCm: h } = opts;
  const { c, ctx } = makeCanvas(w, h);
  const style = opts.style || 'red';
  if (style === 'white') paintWhite(ctx, w, h);
  else if (style === 'circuit') paintCircuit(ctx, w, h, opts.seed);
  else paintRed(ctx, w, h, opts.seed);
  const ink = style === 'white' ? '#1d1f24' : '#ffffff';

  if (opts.title) {
    const size = fitFont(ctx, opts.title, w * 0.85, opts.titleSize || 11, '700');
    const y = textBlock(ctx, opts.title, w / 2, opts.titleY ?? 12, w * 0.9, size, ink, '700');
    if (opts.subtitle) textBlock(ctx, opts.subtitle, w / 2, y - size * 0.1, w * 0.9, size * 0.45, ink, '500');
  }
  for (const cap of opts.captions || []) {
    let y = textBlock(ctx, cap.en, cap.xCm + cap.wCm / 2, cap.yCm, cap.wCm, cap.size || 4.2, ink, '600', 1.2);
    if (cap.zh) textBlock(ctx, cap.zh, cap.xCm + cap.wCm / 2, y + 0.6, cap.wCm, (cap.size || 4.2) * 0.85, ink, '500', 1.2);
  }
  if (opts.brand && opts.brand.text) {
    const b = opts.brand;
    const size = fitFont(ctx, b.text, b.maxW || w * 0.8, b.sizeCm, '800');
    setFont(ctx, size, '800');
    ctx.fillStyle = b.color || '#ffffff';
    ctx.textAlign = b.align || 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetY = 0.6;
    ctx.fillText(b.text, b.xCm, b.yCm);
    ctx.shadowColor = 'transparent';
    let y = b.yCm + size * 1.05;
    for (const ln of b.lines || []) {
      setFont(ctx, size * 0.32, '600');
      ctx.fillText(ln, b.xCm, y);
      y += size * 0.4;
    }
  }
  if (opts.diagram) drawDiagram(ctx, w, h, opts.diagram);
  if (opts.door) {
    const d = opts.door;
    ctx.strokeStyle = style === 'white' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(d.xCm, h - d.hCm, d.wCm, d.hCm);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(d.xCm + d.wCm - 6, h - d.hCm / 2, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}

function drawDiagram(ctx, w, h, { rows = [], top = 108, bottom = 242 }) {
  const n = Math.max(rows.length, 1);
  const gap = 3;
  const rowH = (bottom - top - gap * (n - 1)) / n;
  const x0 = 12, x1 = w - 12;
  rows.forEach((label, i) => {
    const y = top + i * (rowH + gap);
    ctx.fillStyle = 'rgba(232,233,236,0.92)';
    roundRect(ctx, x0, y, x1 - x0, rowH, 3);
    ctx.fill();
    textBlock(ctx, label, x0 + 4, y + rowH / 2 - 4, 36, 3.4, BRAND_RED, '700', 1.15, 'left');
    // Devices and links
    const r = rng(11 + i);
    const count = 4;
    let prev = null;
    for (let k = 0; k < count; k++) {
      const bx = x0 + 52 + k * ((x1 - x0 - 70) / count) + r() * 6;
      const bw = 14 + r() * 8, bh = Math.min(rowH * 0.55, 18);
      const by = y + (rowH - bh) / 2;
      if (prev) {
        ctx.strokeStyle = i === 0 ? '#e0283c' : '#9aa0aa';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(prev, y + rowH / 2);
        ctx.lineTo(bx, y + rowH / 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#b7bcc6';
      ctx.lineWidth = 0.35;
      roundRect(ctx, bx, by, bw, bh, 1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(bx + 2, by + 2, bw - 4, bh * 0.35);
      prev = bx + bw;
    }
  });
  // Vertical bus on the right
  ctx.strokeStyle = '#3b6fd8';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([1.5, 1.2]);
  ctx.beginPath();
  ctx.moveTo(x1 - 8, top - 8);
  ctx.lineTo(x1 - 8, bottom - 6);
  ctx.stroke();
  ctx.setLineDash([]);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** TV screen: blue gradient, optional product name. */
export function screenTexture(en, zh, brand) {
  const { c, ctx, w, h } = makeCanvas(160, 90, 4);
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, '#1f3a9a');
  g.addColorStop(0.7, '#4a6fd0');
  g.addColorStop(1, '#8fa8ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.shadowColor = 'rgba(0,10,40,0.6)';
  ctx.shadowBlur = 1.2;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.75);
  ctx.lineTo(w, h * 0.55);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  if (en) {
    const size = fitFont(ctx, en, w * 0.86, 11, '700');
    let y = textBlock(ctx, en, w / 2, h * 0.3, w * 0.86, size, '#ffffff', '700', 1.15);
    if (zh) textBlock(ctx, zh, w / 2, y + 1, w * 0.86, size * 0.75, '#ffffff', '500', 1.15);
  }
  if (brand) textBlock(ctx, brand, w / 2, en ? h * 0.82 : h * 0.4, w * 0.8, en ? 5 : 14, en ? 'rgba(255,255,255,0.85)' : '#ffffff', '800');
  return toTexture(c);
}

/** Ring sign: white band with the brand name twice. */
export function ringTexture(brand) {
  const c = document.createElement('canvas');
  c.width = 4096;
  c.height = 262;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  if (brand) {
    const size = fitFont(ctx, brand, 880, 190, '800');
    setFont(ctx, size, '800');
    ctx.fillStyle = BRAND_RED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const x of [1024, 3072]) {
      ctx.save();
      ctx.translate(x, c.height / 2 + 6);
      ctx.scale(0.92, 1);
      ctx.fillText(brand, 0, 0);
      ctx.restore();
    }
  }
  return toTexture(c);
}

export function cityTexture() {
  const { c, ctx, w, h } = makeCanvas(400, 250, 4);
  paintCity(ctx, w, h);
  return toTexture(c);
}

/** Reception counter front: white with brand in red. */
export function counterTexture(brand) {
  const { c, ctx, w, h } = makeCanvas(100, 100, 6);
  ctx.fillStyle = '#f3f3f4';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(w, 0, w * 0.4, h);
  g.addColorStop(0, 'rgba(230,0,39,0.35)');
  g.addColorStop(0.5, 'rgba(230,0,39,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (brand) {
    const size = fitFont(ctx, brand, 34, 11, '800');
    setFont(ctx, size, '800');
    ctx.fillStyle = BRAND_RED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(brand, 15, 12);
  }
  // Light strip (right edge + bottom)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#bfe6ff';
  ctx.shadowBlur = 3;
  ctx.fillRect(w - 3, 10, 1.6, h - 12);
  ctx.fillRect(10, h - 3, w - 12, 1.6);
  return toTexture(c);
}

/** Floating "i" marker for clickable products. */
export function markerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRAND_RED;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 70px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('i', 64, 68);
  return toTexture(c);
}
