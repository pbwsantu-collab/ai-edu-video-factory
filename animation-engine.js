/** Phase 3+4.2 Animation Engine (gzip loader) */
import { B0 } from './ae-b0.js';
import { B1 } from './ae-b1.js';
import { B2 } from './ae-b2.js';
const b64 = B0 + B1 + B2;
const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const ds = new DecompressionStream('gzip');
const stream = new Blob([bin]).stream().pipeThrough(ds);
const ab = await new Response(stream).arrayBuffer();
const code = new TextDecoder().decode(ab);
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
const mod = await import(url);
URL.revokeObjectURL(url);
export const ANIMATION_MODES = mod.ANIMATION_MODES;
export const createAnimationEngine = mod.createAnimationEngine;
