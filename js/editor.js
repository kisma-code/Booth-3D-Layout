// Edit the booth data in the browser, then download a new encrypted file.
import { encryptJSON, decryptJSON } from './crypto.js';
import { ANCHORS, MODEL_KINDS } from './anchors.js';

const $ = (s, el = document) => el.querySelector(s);
const PREVIEW_KEY = 'booth3d.preview';
let data = null;
let password = '';

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) e.setAttribute(k, v);
  }
  for (const c of children) if (c != null) e.append(c);
  return e;
}

/** Input bound to obj[key]. */
function field(label, obj, key, { textarea = false, placeholder = '', onChange } = {}) {
  const input = textarea ? el('textarea', { placeholder }) : el('input', { type: 'text', placeholder });
  input.value = obj[key] ?? '';
  input.addEventListener('input', () => { obj[key] = input.value; onChange?.(); });
  return el('label', {}, label, input);
}

// ---------- unlock ----------
$('#unlock-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#unlock-error').textContent = '';
  try {
    const res = await fetch('data/booth-data.enc.json', { cache: 'no-cache' });
    const enc = await res.json();
    const pw = $('#pw').value;
    data = await decryptJSON(enc, pw);
    password = pw;
    openEditor();
  } catch (ex) {
    $('#unlock-error').textContent = ex.message === 'WRONG_PASSWORD' ? 'Wrong password.' : 'Cannot load the data file.';
  }
});

$('#plain-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    data = JSON.parse(await file.text());
    if (!Array.isArray(data.products)) throw new Error();
    password = '';
    openEditor();
  } catch {
    $('#unlock-error').textContent = 'This file is not a booth data JSON file.';
  }
});

function openEditor() {
  data.brand ||= {};
  data.event ||= {};
  data.zones ||= {};
  data.products ||= [];
  data.contact ||= {};
  $('#unlock').hidden = true;
  $('#editor').hidden = false;
  if (!password) $('#new-pw').required = true;
  renderAll();
}

// ---------- render ----------
function renderAll() {
  renderMeta();
  renderZones();
  renderProducts();
  renderAnchors();
}

function renderMeta() {
  const box = $('#meta');
  box.replaceChildren(
    field('Event title', data.event, 'title'),
    field('Booth no.', data.event, 'stand'),
    field('Venue', data.event, 'venue'),
    field('Dates', data.event, 'dates'),
    field('Brand (ring sign, walls)', data.brand, 'name'),
    field('Company line', data.brand, 'company'),
    field('Tagline', data.brand, 'tagline'),
    field('Business card – name (English)', data.contact, 'nameEn'),
    field('Business card – name (Chinese)', data.contact, 'nameZh'),
    field('Business card – job title (English)', data.contact, 'titleEn'),
    field('Business card – job title (Chinese)', data.contact, 'titleZh'),
    field('Business card – mobile', data.contact, 'mobile'),
    field('Business card – email', data.contact, 'email'),
  );
}

const ZONE_LABELS = {
  A_front: 'Wall A front', A_back: 'Wall A back', B_front: 'Wall B front',
  B_back: 'Wall B back', C_front: 'Wall C front', C_back: 'Wall C back',
};
function renderZones() {
  const box = $('#zones');
  box.replaceChildren();
  for (const [id, label] of Object.entries(ZONE_LABELS)) {
    const z = (data.zones[id] ||= { title: '' });
    const row = el('div', { class: 'zone' }, el('code', {}, label), field('Title', z, 'title'), field('Subtitle', z, 'subtitle'));
    box.append(row);
    if (id === 'B_back') {
      const proxy = { rows: (z.rows || []).join('\n') };
      const rows = field('Diagram rows (one per line)', proxy, 'rows', { textarea: true });
      rows.querySelector('textarea').addEventListener('input', () => { z.rows = proxy.rows.split('\n').map((s) => s.trim()).filter(Boolean); });
      box.append(el('div', { class: 'zone' }, el('span'), rows, el('span')));
    }
  }
}

function slug(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'product';
}

function renderProducts() {
  const box = $('#products');
  box.replaceChildren();
  data.products.forEach((p, i) => {
    const title = el('strong', {}, p.nameEn || '(new product)');
    const anchorsProxy = { v: (p.anchors || []).join(', ') };
    const anchorsField = field('Places (place ids, comma separated)', anchorsProxy, 'v', { placeholder: 'e.g. C_front_cabinet1, C_front_tv1' });
    const anchorsInput = anchorsField.querySelector('input');
    anchorsInput.setAttribute('list', 'anchor-ids');
    anchorsInput.addEventListener('change', () => {
      const known = new Set(ANCHORS.map((a) => a.id));
      p.anchors = anchorsProxy.v.split(/[,\s]+/).map((s) => s.trim()).filter((s) => known.has(s));
      anchorsInput.value = p.anchors.join(', ');
      renderAnchors();
    });
    const model = el('select', {}, el('option', { value: '' }, '(default for the place)'), ...MODEL_KINDS.map((k) => el('option', { value: k }, k)));
    model.value = p.model || '';
    model.addEventListener('change', () => { p.model = model.value || undefined; });

    box.append(el('div', { class: 'product' },
      el('div', { class: 'top' }, title,
        el('button', { type: 'button', class: 'danger', onclick: () => {
          if (confirm(`Delete "${p.nameEn}"?`)) { data.products.splice(i, 1); renderProducts(); renderAnchors(); }
        } }, 'Delete')),
      el('div', { class: 'grid2' },
        field('Name (English)', p, 'nameEn', { onChange: () => { title.textContent = p.nameEn || '(new product)'; } }),
        field('Name (Chinese)', p, 'nameZh'),
        field('BU', p, 'bu'),
        field('Product page link (https://…)', p, 'link'),
      ),
      field('Description (shown in the detail panel; empty = "coming soon")', p, 'description', { textarea: true }),
      el('div', { class: 'grid2' }, anchorsField, el('label', {}, '3D model shape', model)),
    ));
  });
  if (!$('#anchor-ids')) document.body.append(el('datalist', { id: 'anchor-ids' }, ...ANCHORS.map((a) => el('option', { value: a.id }, a.label))));
}

function renderAnchors() {
  const used = new Map();
  for (const p of data.products) for (const a of p.anchors || []) used.set(a, [...(used.get(a) || []), p.nameEn]);
  $('#anchor-table tbody').replaceChildren(...ANCHORS.map((a) =>
    el('tr', {}, el('td', {}, a.id), el('td', {}, a.label), el('td', {}, (used.get(a.id) || []).join(', ') || '—'))));
}

$('#add-product').addEventListener('click', () => {
  const base = 'new-product';
  let id = base, n = 1;
  while (data.products.some((p) => p.id === id)) id = `${base}-${++n}`;
  data.products.push({ id, nameEn: '', nameZh: '', bu: '', description: '', link: '', anchors: [] });
  renderProducts();
  $('#products').lastElementChild.scrollIntoView({ behavior: 'smooth' });
});

// ---------- output ----------
function cleaned() {
  const out = structuredClone(data);
  const seen = new Set();
  for (const p of out.products) {
    if (!p.id || p.id.startsWith('new-product')) p.id = slug(p.nameEn);
    while (seen.has(p.id)) p.id += '-2';
    seen.add(p.id);
    if (!p.model) delete p.model;
  }
  return out;
}

function chosenPassword() {
  const a = $('#new-pw').value, b = $('#new-pw2').value;
  if (!a && !b) {
    if (!password) { alert('Set a password first (you opened a plain backup).'); return null; }
    return password;
  }
  if (a.length < 8) { alert('The new password must have 8 or more characters.'); return null; }
  if (a !== b) { alert('The two new passwords are not the same.'); return null; }
  return a;
}

function save(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

$('#download').addEventListener('click', async () => {
  const pw = chosenPassword();
  if (!pw) return;
  const payload = await encryptJSON(cleaned(), pw);
  save(new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'booth-data.enc.json');
  if (pw !== password) {
    password = pw;
    $('#new-pw').value = $('#new-pw2').value = '';
    alert('Saved with the NEW password. Upload the file, then tell your colleagues the new password.');
  }
});

$('#download-plain').addEventListener('click', () => {
  if (!confirm('The plain file is NOT encrypted. Keep it on your computer only. Do not upload it to GitHub. Continue?')) return;
  save(new Blob([JSON.stringify(cleaned(), null, 2)], { type: 'application/json' }), 'booth-data.plain.json');
});

$('#preview').addEventListener('click', () => {
  try {
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(cleaned()));
  } catch {
    alert('Preview needs browser storage. It is blocked in this browser.');
    return;
  }
  window.open('index.html?preview=1', '_blank');
});
