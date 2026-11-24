// Encrypt or decrypt the booth data file from the command line.
//
//   BOOTH_PASSWORD=... node tools/encrypt.mjs encrypt private/booth-data.json data/booth-data.enc.json
//   BOOTH_PASSWORD=... node tools/encrypt.mjs decrypt data/booth-data.enc.json private/booth-data.json
//
// Never commit the plain JSON file. The "private/" folder is in .gitignore.
import { readFile, writeFile } from 'node:fs/promises';
import { encryptJSON, decryptJSON } from '../js/crypto.js';

const [mode, input, output] = process.argv.slice(2);
const password = process.env.BOOTH_PASSWORD;
if (!['encrypt', 'decrypt'].includes(mode) || !input || !output || !password) {
  console.error('Usage: BOOTH_PASSWORD=... node tools/encrypt.mjs <encrypt|decrypt> <input> <output>');
  process.exit(1);
}
const src = JSON.parse(await readFile(input, 'utf8'));
const out = mode === 'encrypt' ? await encryptJSON(src, password) : await decryptJSON(src, password);
await writeFile(output, JSON.stringify(out, null, mode === 'encrypt' ? 0 : 2) + '\n');
console.log(`${mode}ed ${input} -> ${output}`);
