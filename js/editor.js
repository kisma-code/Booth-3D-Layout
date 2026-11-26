// Edit the booth data in the browser.
// Two modes:
//  - publish: unlocked with the editor password. data/editor-key.enc.json (encrypted with the
//    editor password) holds a GitHub token, the repo/branch and the visitor password.
//    "Save & publish" writes the new encrypted data file to GitHub through the API.
//  - manual: no editor key exists yet. Unlocked with the visitor password; download + upload by hand.
import { encryptJSON, decryptJSON } from './crypto.js';
import { ANCHORS, MODEL_KINDS } from './anchors.js';
import { buColor, buKey, compareBu } from './bu.js';

const $ = (s, el = document) => el.querySelector(s);
const PREVIEW_KEY = 'booth3d.preview';
const DATA_PATH = 'data/booth-data.enc.json';
const KEY_PATH = 'data/editor-key.enc.json';
const KEY_ITER = 600000;
let data = null;
let password = ''; // visitor password (encrypts the booth data)
let editorPassword = '';
let gh = null; // { token, owner, repo, branch }

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('LOAD_FAILED');
  return res.json();
}

// ---------- GitHub API ----------
async function ghApi(method, path, body, cfg = gh) {
  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(json?.message || `GitHub error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Create or replace one file on the branch (one commit). */
async function putFile(path, text, message, cfg = gh) {
  let sha;
  try {
    sha = (await ghApi('GET', `/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`, null, cfg)).sha;
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  return ghApi('PUT', `/contents/${path}`, { message, content: toBase64(text), branch: cfg.branch, ...(sha ? { sha } : {}) }, cfg);
}

function status(msg, kind = '') {
  const s = $('#publish-status');
  s.textContent = msg;
  s.className = `status ${kind}`;
}

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
  const err = $('#unlock-error');
  err.textContent = '';
  const btn = $('#unlock-form button');
  btn.disabled = true;
  const pw = $('#pw').value;
  try {
    const [enc, key] = await Promise.all([fetchJSON(DATA_PATH), fetchJSON(KEY_PATH)]);
    if (!enc) throw new Error('LOAD_FAILED');
    if (key) {
      let bundle = null;
      try { bundle = await decryptJSON(key, pw); } catch { /* not the editor password */ }
      if (!bundle) {
        let isVisitor = false;
        try { await decryptJSON(enc, pw); isVisitor = true; } catch { /* wrong */ }
        err.textContent = isVisitor ? 'This is the visitor password. The editor needs the editor password.' : 'Wrong password.';
        return;
      }
      editorPassword = pw;
      password = bundle.viewerPassword;
      gh = { token: bundle.token, owner: bundle.owner, repo: bundle.repo, branch: bundle.branch };
    } else {
      password = pw;
    }
    data = await decryptJSON(enc, password);
    openEditor();
  } catch (ex) {
    err.textContent = ex.message === 'WRONG_PASSWORD' ? 'Wrong password.' : 'Cannot load the data file.';
  } finally {
    btn.disabled = false;
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
  // Old format: one shared card -> copy it into every product that has none.
  if (data.contact) {
    for (const p of data.products) p.contact ||= { ...data.contact };
    delete data.contact;
  }
  $('#unlock').hidden = true;
  $('#editor').hidden = false;
  if (!password) $('#new-pw').required = true;
  renderAll();
  renderMode();
}

function renderMode() {
  const publish = Boolean(gh);
  $('#publish').hidden = !publish;
  $('#help-publish').hidden = !publish;
  $('#help-manual').hidden = publish;
  $('#setup').open = !publish;
  $('#setup-state').textContent = publish ? `On · ${gh.branch}` : 'Off';
  $('#setup-state').title = publish ? `${gh.owner}/${gh.repo}, branch ${gh.branch}` : '';
  const loc = location.hostname.endsWith('.github.io')
    ? { owner: location.hostname.split('.')[0], repo: location.pathname.split('/')[1] || '' }
    : { owner: '', repo: '' };
  $('#gh-owner').value = gh?.owner || loc.owner;
  $('#gh-repo').value = gh?.repo || loc.repo;
  $('#gh-branch').value = gh?.branch || '';
}

// ---------- render ----------
function renderAll() {
  renderMeta();
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
  );
}

function slug(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'product';
}

/** Keep products ordered by BU (A–Z, empty last); the sort is stable, so order inside a BU stays. */
function sortProducts() {
  data.products.sort((a, b) => compareBu(a.bu, b.bu));
}

function renderProducts() {
  sortProducts();
  const box = $('#products');
  box.replaceChildren();
  let lastBu = null;
  data.products.forEach((p, i) => {
    const key = buKey(p.bu);
    if (key !== lastBu) {
      lastBu = key;
      box.append(el('div', { class: 'bu-head', style: `--bu: ${buColor(key)}` }, key || 'No BU'));
    }
    p.contact ||= {};
    const title = el('span', { class: 'p-name' }, p.nameEn || 'New product');
    const bu = el('span', { class: 'p-bu', style: `--bu: ${buColor(p.bu)}` }, p.bu || '—');
    // BU: the tag updates while typing; the list re-sorts when the field loses focus.
    const buField = field('BU', p, 'bu', { onChange: () => { bu.textContent = p.bu || '—'; bu.style.setProperty('--bu', buColor(p.bu)); } });
    buField.querySelector('input').addEventListener('change', () => {
      p._open = true;
      renderProducts();
      const row = [...$('#products').querySelectorAll('.product')].find((d) => d.open);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const meta = el('span', { class: 'p-meta' });
    const setMeta = () => { const n = (p.anchors || []).length; meta.textContent = n ? `${n} place${n > 1 ? 's' : ''}` : 'hidden'; };
    setMeta();
    const anchorsProxy = { v: (p.anchors || []).join(', ') };
    const anchorsField = field('Places', anchorsProxy, 'v', { placeholder: 'e.g. C_front_cabinet1, C_front_tv1' });
    const anchorsInput = anchorsField.querySelector('input');
    anchorsInput.setAttribute('list', 'anchor-ids');
    anchorsInput.addEventListener('change', () => {
      const known = new Set(ANCHORS.map((a) => a.id));
      p.anchors = anchorsProxy.v.split(/[,\s]+/).map((s) => s.trim()).filter((s) => known.has(s));
      anchorsInput.value = p.anchors.join(', ');
      setMeta();
      renderAnchors();
    });
    const model = el('select', {}, el('option', { value: '' }, '(default for the place)'), ...MODEL_KINDS.map((k) => el('option', { value: k }, k)));
    model.value = p.model || '';
    model.addEventListener('change', () => { p.model = model.value || undefined; });

    const item = el('details', { class: 'product' },
      el('summary', {}, title, bu, meta),
      el('div', { class: 'p-body' },
        el('div', { class: 'grid2' },
          field('Name (English)', p, 'nameEn', { onChange: () => { title.textContent = p.nameEn || 'New product'; } }),
          field('Name (Chinese)', p, 'nameZh'),
          buField,
          field('Product page link', p, 'link', { placeholder: 'https://…' }),
        ),
        field('Description (English)', p, 'description', { textarea: true, placeholder: 'Empty = “Product description coming soon.”' }),
        field('Description (Chinese)', p, 'descriptionZh', { textarea: true, placeholder: 'Empty = the English description is shown in Chinese mode' }),
        el('div', { class: 'grid2' }, anchorsField, el('label', {}, '3D model shape', model)),
        el('div', { class: 'p-card' },
          el('div', { class: 'p-card-head' }, 'Business card', el('span', { class: 'muted small' }, 'shown by “Contact sales”')),
          el('div', { class: 'grid2' },
            field('Name (English)', p.contact, 'nameEn'),
            field('Name (Chinese)', p.contact, 'nameZh'),
            field('Job title (English)', p.contact, 'titleEn'),
            field('Job title (Chinese)', p.contact, 'titleZh'),
            field('Mobile', p.contact, 'mobile'),
            field('Email', p.contact, 'email'),
          ),
        ),
        el('div', { class: 'p-foot' },
          el('button', { type: 'button', class: 'danger', onclick: () => {
            if (confirm(`Delete "${p.nameEn || 'this product'}"?`)) { data.products.splice(i, 1); renderProducts(); renderAnchors(); }
          } }, 'Delete product')),
      ),
    );
    if (p._open) { item.open = true; delete p._open; }
    box.append(item);
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
  const lastCard = data.products.at(-1)?.contact;
  data.products.push({ id, nameEn: '', nameZh: '', bu: '', description: '', descriptionZh: '', link: '', anchors: [], contact: { ...(lastCard || {}) }, _open: true });
  renderProducts();
  $('#products').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    delete p._open;
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

// ---------- publish ----------
async function saveKeyBundle(cfg, edPw, viewerPw) {
  const bundle = await encryptJSON({ ...cfg, viewerPassword: viewerPw }, edPw, KEY_ITER);
  await putFile(KEY_PATH, JSON.stringify(bundle) + '\n', 'Update editor key', cfg);
}

$('#publish').addEventListener('click', async () => {
  const pw = chosenPassword();
  if (!pw) return;
  const btn = $('#publish');
  btn.disabled = true;
  status('Publishing…');
  try {
    const payload = await encryptJSON(cleaned(), pw);
    await putFile(DATA_PATH, JSON.stringify(payload) + '\n', 'Update booth data');
    if (pw !== password) {
      await saveKeyBundle(gh, editorPassword, pw);
      password = pw;
      $('#new-pw').value = $('#new-pw2').value = '';
      status('Published with the NEW visitor password. The booth updates in 1–2 minutes. Tell your colleagues the new password.', 'ok');
    } else {
      status(`Published ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · live in 1–2 min`, 'ok');
    }
  } catch (e) {
    status(`Not published: ${explain(e)}`, 'bad');
  } finally {
    btn.disabled = false;
  }
});

function explain(e) {
  if (e.status === 401) return 'the GitHub token is not valid or has expired. Make a new token and save it in "Publishing setup".';
  if (e.status === 403 || e.status === 404) return 'the token has no write access to this repo or branch. Check the token permissions in "Publishing setup".';
  if (e.status === 409 || e.status === 422) return 'the file changed on GitHub at the same time. Reload the editor and try again.';
  return e.message || 'network error.';
}

$('#setup-save').addEventListener('click', async () => {
  const token = $('#gh-token').value.trim() || gh?.token;
  const owner = $('#gh-owner').value.trim();
  const repo = $('#gh-repo').value.trim();
  const a = $('#ed-pw').value, b = $('#ed-pw2').value;
  const edPw = a || b ? a : editorPassword;
  if (!token) return alert('Paste a GitHub token.');
  if (!owner || !repo) return alert('Type the repo owner and the repo name.');
  if (!edPw) return alert('Choose an editor password.');
  if (a || b) {
    if (a.length < 12) return alert('The editor password must have 12 or more characters.');
    if (a !== b) return alert('The two editor passwords are not the same.');
    if (a === password) return alert('The editor password must be different from the visitor password.');
  }
  if (!password) return alert('Set the visitor password first (you opened a plain backup).');
  const btn = $('#setup-save');
  btn.disabled = true;
  status('Checking the token…');
  try {
    const cfg = { token, owner, repo, branch: $('#gh-branch').value.trim() };
    const info = await ghApi('GET', '', null, cfg);
    if (info.permissions && !info.permissions.push) throw Object.assign(new Error(''), { status: 403 });
    if (!cfg.branch) {
      try { cfg.branch = (await ghApi('GET', '/pages', null, cfg)).source.branch; } catch { cfg.branch = info.default_branch; }
    }
    await ghApi('GET', `/branches/${encodeURIComponent(cfg.branch)}`, null, cfg);
    await saveKeyBundle(cfg, edPw, password);
    gh = cfg;
    editorPassword = edPw;
    $('#gh-token').value = $('#ed-pw').value = $('#ed-pw2').value = '';
    renderMode();
    status(`Publishing is on (branch ${cfg.branch}). Next time, use the editor password.`, 'ok');
  } catch (e) {
    status(`Setup not saved: ${explain(e)}`, 'bad');
  } finally {
    btn.disabled = false;
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
