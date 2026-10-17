/** Phase 3+4.3 Animation Engine */
import { AE_A0 } from './ae-src-a0.js';
import { AE_A1 } from './ae-src-a1.js';
import { AE_B0 } from './ae-src-b0.js';
import { AE_B1 } from './ae-src-b1.js';
const bin = Uint8Array.from(atob(AE_A0 + AE_A1 + AE_B0 + AE_B1), c => c.charCodeAt(0));
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
const mod = await import(url);
URL.revokeObjectURL(url);
export const ANIMATION_MODES = mod.ANIMATION_MODES;
export const createAnimationEngine = mod.createAnimationEngine;
