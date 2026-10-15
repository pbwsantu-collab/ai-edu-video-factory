# AI Education Video Factory – Phase 1 + Phase 2 + Phase 3

Responsive Progressive Web App (PWA) for creating educational video lesson projects locally, with an AI Lesson Engine and browser-based Animation Studio.

## Phase 1 (complete)

- Dashboard with project list
- Create Lesson wizard (class, subject, language, animation mode, text)
- PDF / image import interface
- Lesson editor (scenes) and storyboard
- Save / reopen / rename / delete via **IndexedDB**
- Responsive layouts (Windows + Android)
- Accessible forms and clear errors
- Offline static assets via service worker

## Phase 2 – AI Lesson Engine (complete)

### Textbook input
- Text input preserved
- **PDF text extraction** via PDF.js (browser CDN)
- Image import with **OCR integration point** (Tesseract.js optional; not loaded by default)
- Original extracted text preserved on the project
- Clear errors for unsupported or oversized files

### AI providers (modular)
| Provider | Behaviour |
|----------|-----------|
| **Manual only** | Always available. Empty structure for hand editing. |
| **Test structure** | Offline demo. Fills sample bilingual/MCQ data for UI testing. **Not real AI.** |
| **Ollama (local)** | Calls `http://127.0.0.1:11434` (configurable). Fails clearly if Ollama is down or has no models. |

- No paid cloud APIs connected
- No API keys in browser JavaScript
- Model name configurable for Ollama

### Structured lesson output (editable)
- Original lesson text
- English + Bengali explanations
- Sentence-by-sentence EN/BN meanings
- Vocabulary with Bengali meanings + pronunciation
- Important concepts
- MCQs with correct answers + explanations
- Scene-planning notes
- Subject extras (math steps, science diagrams, history timeline, etc.)

### Teacher review
- Full edit of all generated fields
- Approve / unapprove before later stages
- Original source text kept distinct from AI text

### Storage
- IndexedDB schema version **2** (additive `lessonData` on projects)

## Phase 3 – Animation Engine (this release)

### Animation Studio
- Integrated into the existing app (button from Lesson Editor)
- Project / lesson context preserved
- Animation-mode selector (7 educational modes)
- Scene storyboard with reorder, duplicate, delete, add
- Scene preview stage
- Playback: Play, Pause, Resume, Restart, Previous / Next scene
- Playback speed control (0.5×–2×)
- Timeline / progress indicator
- Scene duration control
- Edit scene text, English / Bengali, narration, teacher notes
- Save animation project / reopen after reload
- Reset preview
- Clear error messages for unapproved lessons

### Supported animation modes
| Mode | Behaviour |
|------|-----------|
| **Whiteboard** | Sequential headings, progressive text, simple pointer |
| **Classroom** | Board + teacher-style presentation area |
| **Diagram** | SVG shapes, arrows, progressive labels (illustrative) |
| **Timeline** | Horizontal timeline with sequential events |
| **Text & Vocabulary** | English–Bengali pairs, vocab cards, progressive reveal |
| **Mathematics Step** | Problem + step-by-step solution highlight |
| **Science Process** | Sequential stages with arrows (illustrative) |

### Scene generation from approved lessons
- Requires **teacher approval** in Lesson Engine
- Maps concepts, sentences, vocabulary, subject extras, scene notes → editable scenes
- Manual scene creation always available
- Does **not** invent scientifically accurate diagrams or verified math answers
- Bengali Unicode preserved

### Scene data & persistence
- Versioned scene objects (display text, EN/BN, narration, visual elements, steps, duration)
- `animationData` stored **additively** on the existing project record (IndexedDB v3)
- Does not overwrite original textbook text or approved lesson content
- Survives browser reload

### Playback engine
- `requestAnimationFrame` based
- Respects `prefers-reduced-motion`
- Pauses safely on tab visibility change
- No duplicate animation loops; timers cleaned on scene change

### Offline / PWA
- Service worker cache **v4** includes `animation-engine.js`
- Core playback does not depend on external CDNs beyond existing idb import

## Not implemented (labelled in UI)

- Paid AI services
- Video export / recording (Phase 4)
- OCR until Tesseract.js is loaded by the host page
- Cloud sync
- Fully accurate scientific simulations or verified mathematical solvers

## Requirements

- Modern browser with IndexedDB
- Optional: [Ollama](https://ollama.com) for local generation (`ollama serve`, `ollama pull llama3.2`)
- Ollama may need CORS enabled for browser calls from your origin

## Installation & startup

```bash
cd ai-edu-video-factory
python3 -m http.server 4173
# open http://localhost:4173
```

Or:

```bash
npx --yes serve -s . -l 4173
```

### Ollama (optional)

```bash
ollama serve
ollama pull llama3.2
# In the app: Provider = Ollama, Check provider, then Generate
```

### Optional OCR

Load Tesseract.js and set `window.Tesseract` before importing images if you need photograph OCR.

## Limitations (honest)

- Animation is educational illustration, not cinematic production.
- Diagram and science modes use simple SVG/CSS; labels are editable.
- Math steps display stored text; no symbolic computation or answer verification is performed.
- Ollama generation quality depends on the local model and is not guaranteed.
- Large projects are limited by browser IndexedDB quota.
