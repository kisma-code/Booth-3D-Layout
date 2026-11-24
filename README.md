# Booth 3D Layout

A walkable 3D model of an exhibition booth, made for GitHub Pages.
Visitors walk through the booth (first-person view) and click products to see their details.

- No build step. Plain HTML + JavaScript + [three.js](https://threejs.org) (in `vendor/`).
- All text and product data are **encrypted** (`data/booth-data.enc.json`, AES-256-GCM, key from the password with PBKDF2).
  The repo is public, so the plain data is never committed. Visitors type a shared password to open the booth.
- Search engines are told not to index the site (`robots.txt` and a `noindex` meta tag).

> The password protects the booth text and product data. The 3D shape of the booth (in `js/scene.js`) is not encrypted.

## Controls

| Device | Walk | Look | Product details |
|---|---|---|---|
| Desktop | `W` `A` `S` `D` / arrow keys, `Shift` = run | Mouse (click "enter" first) | Point the dot at a product and click |
| Phone / tablet | Joystick (bottom left) | Drag with one finger | Tap the product or its (i) marker |

`P` (or the **☰ Products** button) opens a list of all products. Click one to go to it.

## Turn on GitHub Pages (one time)

1. On GitHub, open the repo → **Settings** → **Pages**.
2. **Source**: *Deploy from a branch*. Select the branch with this code and the folder `/ (root)`. Click **Save**.
3. After 1–2 minutes the page shows the site address (`https://<owner>.github.io/<repo>/`). Share it with the password.

## Change product descriptions (no coding)

1. Open `https://<owner>.github.io/<repo>/editor.html` and type the password.
2. Edit names, descriptions, links, wall titles, or where each product stands.
   Click **Preview in booth** to check (only you see the preview).
3. Click **Download encrypted file** → you get `booth-data.enc.json`.
   You can also set a new password here.
4. On GitHub: open the `data/` folder → **Add file** → **Upload files** → drop the file → **Commit changes**.

Never upload the "plain JSON backup" from the editor. It is not encrypted.

## Command line (optional)

```bash
BOOTH_PASSWORD='…' node tools/encrypt.mjs decrypt data/booth-data.enc.json private/booth-data.json
BOOTH_PASSWORD='…' node tools/encrypt.mjs encrypt private/booth-data.json data/booth-data.enc.json
```

The `private/` folder is in `.gitignore`.

## Files

| Path | What it does |
|---|---|
| `index.html`, `js/app.js` | Password screen, UI, picking, product panel |
| `js/scene.js` | Booth geometry (from the floor plan, 12 m × 6 m) and the hall |
| `js/models.js` | Simple stand-in 3D product models |
| `js/textures.js` | Wall graphics, screens, LED wall, ring sign (painted at run time) |
| `js/controls.js` | First-person walking, touch joystick, collisions |
| `js/anchors.js` | List of places where products can stand |
| `js/crypto.js` | Encrypt / decrypt the data file |
| `editor.html`, `js/editor.js` | Data editor |
| `data/booth-data.enc.json` | Encrypted booth data |
