/** Phase 3 app.js gzip loader */
import { A0 } from './app-b0.js';
import { A1 } from './app-b1.js';
import { A2a } from './app-b2a.js';
import { A2b } from './app-b2b.js';
import { A3a } from './app-b3a.js';
import { A3b } from './app-b3b.js';
const b64 = A0 + A1 + A2a + A2b + A3a + A3b;
const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const ds = new DecompressionStream('gzip');
const stream = new Blob([bin]).stream().pipeThrough(ds);
const ab = await new Response(stream).arrayBuffer();
const code = new TextDecoder().decode(ab);
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
await import(url);
URL.revokeObjectURL(url);
