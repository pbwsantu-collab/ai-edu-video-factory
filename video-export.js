/** Phase 4.3 source loader */
const parts = await Promise.all([fetch(new URL('./ve-src.part0.txt', import.meta.url)).then(r=>r.text()), fetch(new URL('./ve-src.part1.txt', import.meta.url)).then(r=>r.text()), fetch(new URL('./ve-src.part2.txt', import.meta.url)).then(r=>r.text())]);
const code = parts.join('');
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
const mod = await import(url);
URL.revokeObjectURL(url);
export const VIDEO_RESOLUTIONS = mod.VIDEO_RESOLUTIONS;
export const VIDEO_FPS = mod.VIDEO_FPS;
export const VIDEO_BACKGROUNDS = mod.VIDEO_BACKGROUNDS;
export const TRANSITIONS = mod.TRANSITIONS;
export const drawSceneFrame = mod.drawSceneFrame;
export const renderVideo = mod.renderVideo;
export const supportsVideoExport = mod.supportsVideoExport;
export const createVideoExporter = mod.createVideoExporter;
export const applyPresentationOverlays = mod.applyPresentationOverlays;
