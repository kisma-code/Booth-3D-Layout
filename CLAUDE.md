# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A walkable first-person 3D model of an exhibition booth (12 m × 6 m stand), hosted as a static site on GitHub Pages. Visitors type a shared password, walk through the booth, and click products to open a detail panel. There is no build step, no package.json and no test suite: plain HTML + ES modules + a vendored three.js (`vendor/three.module.min.js`, mapped to `"three"` by the import map in `index.html`).

## Commands

```bash
# Serve locally (ES modules need http, not file://)
python3 -m http.server 8123 --bind 127.0.0.1

# Decrypt / encrypt the data file (password comes from the env var)
BOOTH_PASSWORD='…' node tools/encrypt.mjs decrypt data/booth-data.enc.json private/booth-data.json
BOOTH_PASSWORD='…' node tools/encrypt.mjs encrypt private/booth-data.json data/booth-data.enc.json
```

Deploy = push to the branch that GitHub Pages serves (Settings → Pages → Deploy from a branch, `/ (root)`). `.nojekyll` must stay.

GitHub Pages lets browsers cache files for 10 minutes, so visitors can get old JS. Before committing any change in `js/` or `css/`, run `node tools/stamp-version.mjs`: it rewrites the import map in `index.html` and `editor.html` (every `js/*.js` → `?v=<timestamp>`) and the `?v=` on the entry script and stylesheet. A new file in `js/` must be imported with a relative `./name.js` path so the import map catches it.

For checking changes, drive the page with Playwright (preinstalled): `window.__booth` exposes `{ controls, goTo(id), openPanel(id), closePanel(), pick(x, y), world, camera }`. Headless browsers have no pointer lock, so set `__booth.controls.fallback = true; __booth.controls.onLockChange(false)` first, or the pause overlay covers screenshots.

## The data/secrecy model (most important constraint)

The repo is **public**. All booth text and product data live only in `data/booth-data.enc.json` (PBKDF2-SHA256 + AES-256-GCM, `js/crypto.js`, shared by browser and Node).
- Never commit plain data. The plain JSON lives in `private/` (gitignored); `private/password.txt` holds the current password locally.
- Keep company, brand and product names **out of committed code, comments and commit messages**. Code refers to places by anchor id and to shapes by generic model kind; all visible text (brand, wall titles, product names, event info) is read from the decrypted data at run time. Before committing, grep the non-vendor files for product/brand names.
- After any data change: edit `private/booth-data.json`, re-encrypt with the current password, commit only the `.enc.json`.
- Non-developers edit data through `editor.html` (`js/editor.js`): decrypt in the browser, edit, "Preview in booth" (passes data via `sessionStorage` key `booth3d.preview` to `index.html?preview=1`), then publish.
- Two passwords. `data/editor-key.enc.json` = `{ token, owner, repo, branch, viewerPassword }` encrypted with the **editor password** (600k PBKDF2 rounds). When it exists, the editor only accepts the editor password and "Save & publish" PUTs `data/booth-data.enc.json` (encrypted with the visitor password) through the GitHub contents API; changing the visitor password re-writes the key file too. When it does not exist, the editor opens with the visitor password in manual mode (download + upload) and shows the setup form. Local re-encryption with `tools/encrypt.mjs` stays valid as long as the visitor password is unchanged.

Data shape: `{ brand, event, zones: { <zoneId>: { title, subtitle?, rows? } }, products: [{ id, nameEn, nameZh, bu, description, descriptionZh, link, model?, anchors: [anchorId…], contact: { nameEn, nameZh, titleEn, titleZh, mobile, email } }] }`. Each product's `contact` fills the business card that its "Contact sales" button opens. An old top-level `contact` is still read as a fallback by the booth, and the editor copies it into every product on open.

## Architecture

**Anchors connect data to geometry.** `js/anchors.js` lists every place a product can appear (TVs, shelves, cabinet tops, the full-wall graphic, floor unit, LED wall, counter), each with an optional default model kind. A product lists anchor ids; its first anchor gets the floating (i) marker and is the "go to" viewpoint. A product with no anchors is hidden. The product's `model` field overrides the anchor's default model kind. Adding a new place = add it to `ANCHORS`, then build it in `scene.js` with `tv(...)`, `model(...)` or `register(...)`.

**`js/scene.js` – `buildWorld(data, renderer)`** builds everything and returns `{ scene, clickables, colliders, productMeshes, viewpointFor, update, bounds, floorHeightAt }`.
- Plan coordinates are centimetres from the top-left of the stand drawing (x right, y down); `P(x, y)` converts to world metres with the booth centre at the origin. Display walls are rotated 45° (`Q45`); each `wall({...})` spec has `front`/`back` faces (zone id, style, caption slots in cm) and a `build(g)` callback that places TVs, cabinets and models in wall-local coordinates (front = local +Z, back = −Z, wall is 0.6 m thick, raised floor `FLOOR_H` = 0.1 m).
- Wall face textures are painted at run time from zone data (`captionsFor` auto-captions products on that face, skipping duplicates and ones matching the zone title).
- `register(id, obj, normal, dist)` records an anchor; if a product uses that anchor, `makeClickable` clones the mesh materials (single or per-face arrays) and tags meshes with `userData.productId`. Highlight state is stored in each material's `userData.base`.
- Colliders are 2D: oriented rects `{cx, cz, hx, hz, rot}` and circles. Use `addLocalRect` for objects inside a rotated wall group.

**`js/models.js` – `buildModel(kind, { brand })`**: procedural stand-in product models (origin = bottom centre, front = +Z), detailed with canvas textures from `paintTexture` in `js/textures.js`. Material arrays per box face are allowed.

**`js/i18n.js`**: EN / 中文 switch for screens and panels (`t(key)`, `pickText(en, zh)` in app.js; static HTML uses `data-i18n`, `data-i18n-html`, `data-i18n-attr`). Language = saved choice (localStorage `booth3d.lang`) or browser language. 3D wall graphics stay bilingual and do not switch. Note: `app.js` has its own raycast `pick()`, so the i18n `pick` is imported as `pickText`.

**`js/bu.js`**: BU tag colours (`buColor`) and BU ordering (`compareBu`: A–Z, empty last), shared by the booth (panel tag, product list groups) and the editor (product list groups, kept sorted by BU).

**`js/textures.js`**: canvas painters in centimetre units (wall panels in red/white/circuit styles, screens, ring sign, LED city scene, counter, marker icon).

**`js/controls.js` – `FPSControls`**: pointer-lock mouse look (desktop), drag-to-look fallback when pointer lock fails, touch joystick + drag + tap (mobile), WASD/arrows, collision resolution against `world.colliders` and `world.bounds`. Selection goes through `onSelectAt(x, y)` (`null` = screen centre).

**`js/app.js`**: password unlock (password cached in `sessionStorage`), renderer/camera, UI overlays (start/pause, product list drawer, detail panel with per-BU tag colours), raycast picking (glass/transparent decoration is marked `userData.noHit` so it doesn't block clicks; call `camera.updateMatrixWorld()` before picking right after moving the camera), render loop.

## Conventions

- three.js is pinned to the vendored 0.160.1 copy; `vendor/RoomEnvironment.js` imports from `"three"` via the import map. Do not switch to a CDN.
- The source layout drawings use Chinese labels; wall/cabinet sizes in `scene.js` comments reference those drawing pages (p.3–p.15).
- The user's preference: answer in ASD-STE100 (Simplified Technical English) and ask clarifying questions one at a time before generating.
