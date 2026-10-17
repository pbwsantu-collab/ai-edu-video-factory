/** Phase 3+4.3 Animation Engine */
import { AE_A } from './ae-src-a.js';
import { AE_B } from './ae-src-b.js';
const bin = Uint8Array.from(atob(AE_A + AE_B), c => c.charCodeAt(0));
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
