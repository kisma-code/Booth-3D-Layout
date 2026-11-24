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

## Change the booth text (no coding)

The editor is at `https://<owner>.github.io/<repo>/editor.html`.

### One-time setup: publish from the website

1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   Repository access: **Only select repositories** → this repo. Permissions: **Contents: Read and write**. Set an expiry date.
2. Open the editor and type the **visitor password** (this works only before setup).
3. Open **Publishing setup (admin)**. Paste the token, choose a long **editor password** (12+ characters, different from the visitor password), click **Save publishing settings**.

The token, the repo/branch and the visitor password are saved to `data/editor-key.enc.json`, encrypted with the editor password (PBKDF2, 600 000 rounds). The visitor password cannot open it. After setup, the editor accepts only the editor password.

### Every day

1. Open the editor with the **editor password**.
2. Edit names, descriptions, links, wall titles, the business card, or where each product stands. **Preview in booth** shows the result only to you.
3. Click **Save & publish**. The booth shows the change after 1–2 minutes.

To change the visitor password, fill **Visitor password** and click **Save & publish** (the editor key is updated too).
When the token expires, make a new one and paste it in **Publishing setup** (leave the editor password fields empty to keep it).
If you forget the editor password, delete `data/editor-key.enc.json` on GitHub and do the setup again.

Without setup, the editor still works by hand: **Download encrypted file**, then upload it to `data/` on GitHub.
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
