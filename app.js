/**
 * AI Education Video Factory – Phase 1 + Phase 2 + Phase 3 (Animation Engine)
 * Local-first PWA with IndexedDB project storage.
 * Video export is NOT implemented yet (Phase 4).
 */

import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';
import { createProviderRegistry, emptyLessonFromText } from './ai-providers.js';
import { extractTextFromPdf, extractTextFromImage, validateImportFile } from './pdf-extract.js';
import { createLessonEngine } from './lesson-engine.js';
import { createAnimationEngine, ANIMATION_MODES } from './animation-engine.js';

// ---------- Constants ----------
const DB_NAME = 'ai-edu-video-factory';
const DB_VERSION = 3;
const STORE = 'projects';
