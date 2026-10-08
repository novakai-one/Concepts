// Copy the Pyodide runtime (real Python in the browser) from node_modules into the game's public
// folder, so the game serves it itself (no CDN). Run by `npm run gen`.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'node_modules', 'pyodide');
const out = join(here, '..', 'site', 'public', 'singular', 'pyodide');
const files = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'pyodide.mjs', 'pyodide.js', 'python_stdlib.zip', 'pyodide-lock.json'];
if (!existsSync(src)) { console.warn('copy-pyodide: node_modules/pyodide missing (run npm install)'); process.exit(0); }
mkdirSync(out, { recursive: true });
for (const f of files) cpSync(join(src, f), join(out, f));
console.log(`copy-pyodide: ${files.length} files → site/public/singular/pyodide/`);
