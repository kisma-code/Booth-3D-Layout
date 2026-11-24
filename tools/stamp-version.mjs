// Cache busting for GitHub Pages (it lets browsers cache files for 10 minutes).
// Writes a new version into index.html and editor.html:
//   - the import map maps every js/*.js module to "js/<name>.js?v=<version>"
//   - the entry <script> and the stylesheet <link> get "?v=<version>"
// Run before each commit that changes js/ or css/:  node tools/stamp-version.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';

const version = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const modules = (await readdir('js')).filter((f) => f.endsWith('.js')).sort();

const imports = { three: './vendor/three.module.min.js' };
for (const f of modules) imports[`./js/${f}`] = `./js/${f}?v=${version}`;
const importMap = `<script type="importmap">\n    ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n    ')}\n  </script>`;

for (const file of ['index.html', 'editor.html']) {
  let html = await readFile(file, 'utf8');
  if (/<script type="importmap">[\s\S]*?<\/script>/.test(html)) {
    html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, importMap);
  } else {
    html = html.replace(/(\s*)<\/head>/, `$1  ${importMap}$1</head>`);
  }
  html = html
    .replace(/(<script type="module" src="js\/[\w-]+\.js)(\?v=\w+)?"/g, `$1?v=${version}"`)
    .replace(/(<link rel="stylesheet" href="css\/[\w-]+\.css)(\?v=\w+)?"/g, `$1?v=${version}"`);
  await writeFile(file, html);
}
console.log(`stamped version ${version} (${modules.length} modules)`);
