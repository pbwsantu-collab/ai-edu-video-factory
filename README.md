# AI Education Video Factory – Phase 1 + Phase 2

Responsive Progressive Web App (PWA) for creating educational video lesson projects locally, with an AI Lesson Engine for structured bilingual content.

## Phase 1 (complete)

- Dashboard with project list
- Create Lesson wizard (class, subject, language, animation mode, text)
- PDF / image import interface
- Lesson editor (scenes) and storyboard
- Save / reopen / rename / delete via **IndexedDB**
- Responsive layouts (Windows + Android)
- Accessible forms and clear errors
- Offline static assets via service worker

## Phase 2 – AI Lesson Engine (this release)

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
- Scene-planning notes (for future animation)
- Subject extras (math steps, science diagrams, history timeline, geography maps, etc.)

### Subject adaptation (Classes V–XII focus)
English, Bengali, Mathematics, Physical Science, Life Science, History, Geography, EVS, Computer Science (+ legacy subjects).

### Teacher review
- Full edit of all generated fields
- Approve / unapprove before later stages
- Original source text kept distinct from AI text
- Warning when chapter name lacks verified file/text source

### Storage
- IndexedDB schema version **2** (additive `lessonData` on projects)
- Existing Phase 1 projects remain readable
- Save / reopen generated content; storage errors reported without silent data loss

## Not implemented (labelled in UI)

- Paid AI services
- Animation engine / video export
- OCR until Tesseract.js is loaded by the host page
- Cloud sync

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

If the browser blocks requests, configure Ollama CORS or use a local reverse proxy. The app never claims success when Ollama is unreachable.

### Optional OCR

Load Tesseract.js and set `window.Tesseract` before importing images if you need photograph OCR.

## Project structure

```
ai-edu-video-factory/
├── index.html
├── styles.css
├── app.js              # UI + IndexedDB
├── lesson-engine.js    # Phase 2 review, generation, approval
├── ai-providers.js     # Manual / Test / Ollama providers
├── pdf-extract.js      # PDF.js extraction + OCR hook
├── sw.js
├── manifest.json
├── favicon.svg
└── README.md
```

## Data model (IndexedDB `projects`)

Phase 1 fields plus:

```js
{
  chapterName: string,
  hasVerifiedSource: boolean,
  lessonData: {
    originalText, englishExplanation, bengaliExplanation,
    sentences: [{ en, bn }],
    vocabulary: [{ word, meaningBn, pronunciation }],
    concepts: string[],
    mcqs: [{ question, options, correctIndex, explanation }],
    sceneNotes: string[],
    subjectExtras: object,
    generatedAt, provider, model,
    approved, approvedAt
  }
}
```

## Testing checklist (Phase 2)

1. Phase 1 create / save / reopen / rename / delete still works
2. PDF extraction fills text content
3. Invalid file types show errors
4. Manual + Test providers work offline
5. Ollama reports unavailable when not running (no fake success)
6. Bengali text saves and reloads
7. MCQ edit + approve persist
8. Mobile layout usable

## Git

Tag `phase1-complete` marks the pre–Phase 2 checkpoint.

---

**Stop after Phase 2.** Animation engine and video exporter are out of scope.
