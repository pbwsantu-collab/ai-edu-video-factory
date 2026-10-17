/** Phase 4.2 app.js gzip loader — rewrite relative imports for blob: modules */
import { A0 } from './app-b0.js';
import { A1 } from './app-b1.js';
import { A2 } from './app-b2.js';
import { A3 } from './app-b3.js';
const b64 = A0 + A1 + A2 + A3;
const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const ds = new DecompressionStream('gzip');
const stream = new Blob([bin]).stream().pipeThrough(ds);
const ab = await new Response(stream).arrayBuffer();
let code = new TextDecoder().decode(ab);
const base = import.meta.url;
code = code.replace(/(from\s+|import\s*\()(['"])(\.\.?\/[^'"]+)\2/g, (m, kw, q, spec) => {
  return kw + q + new URL(spec, base).href + q;
});
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
await import(url);
URL.revokeObjectURL(url);
