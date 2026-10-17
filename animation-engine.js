/** Phase 4.3 source loader */
import { A0 } from './anim-p0.js';
import { A1 } from './anim-p1.js';
import { A2 } from './anim-p2.js';
import { A3 } from './anim-p3.js';
import { A4 } from './anim-p4.js';
const code = A0 + A1 + A2 + A3 + A4;
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
const mod = await import(url);
URL.revokeObjectURL(url);
export const ANIMATION_MODES = mod.ANIMATION_MODES;
export const createAnimationEngine = mod.createAnimationEngine;
