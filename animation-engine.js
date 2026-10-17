/** Phase 4.3 source loader */
const parts = await Promise.all([fetch(new URL('./ae-src.part0.txt', import.meta.url)).then(r=>r.text()), fetch(new URL('./ae-src.part1.txt', import.meta.url)).then(r=>r.text()), fetch(new URL('./ae-src.part2.txt', import.meta.url)).then(r=>r.text())]);
const code = parts.join('');
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
const mod = await import(url);
URL.revokeObjectURL(url);
export const ANIMATION_MODES = mod.ANIMATION_MODES;
export const createAnimationEngine = mod.createAnimationEngine;
