/**
 * Phase 3 – Animation Engine loader
 * Reconstructs full engine from chunks (connector size limits).
 */
import { A } from './ae-chunk-a.js';
import { B } from './ae-chunk-b.js';

const code = A + B;
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
const mod = await import(url);
URL.revokeObjectURL(url);

export const ANIMATION_MODES = mod.ANIMATION_MODES;
export const createAnimationEngine = mod.createAnimationEngine;
