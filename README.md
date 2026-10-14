# AI Education Video Factory – Phase 1

Responsive Progressive Web App (PWA) for creating and managing educational video lesson projects locally.

**Phase 1 scope (implemented):**
- Dashboard with project list
- Create Lesson wizard (class, subject, teaching language, animation mode, text input)
- PDF / image import interface (files stored with project; extraction not yet implemented)
- Lesson editor (scenes, content, notes)
- Storyboard view
- Save / reopen / rename / delete projects
- IndexedDB persistent local storage
- Responsive layouts (desktop Windows + Android/mobile)
- Accessible forms and clear error messages
- Offline-capable static assets via service worker

**Explicitly not implemented yet (clearly labelled in UI):**
- Paid AI services / script generation
- Full animation engine / video export
- PDF text extraction & analysis
- Voiceover / TTS

## Requirements

- Modern browser (Chrome, Edge, Firefox, Safari) with IndexedDB support
- Optional: Node.js 18+ if you want to use a local static server or Vite

## Installation & startup

### Option A – Simple static server (recommended for Phase 1)

```bash
cd ai-edu-video-factory
npx --yes serve -s . -l 4173
```

Then open http://localhost:4173

Or with Python:

```bash
cd ai-edu-video-factory
python3 -m http.server 4173
```

### Option B – Vite (if you prefer hot reload)

```bash
cd ai-edu-video-factory
npm install vite --save-dev
npx vite
```

### Production build

Because Phase 1 is a pure static PWA (no bundler required for core functionality), the “production” artifacts are the same files:

```bash
# Copy or deploy the folder contents to any static host
# (Netlify, Vercel, GitHub Pages, Nginx, etc.)
```

If using Vite:

```bash
npx vite build
# output in dist/
```

## Testing performed (Phase 1)

1. **Project creation & persistence** – Create lesson through wizard → appears on dashboard after reload (IndexedDB).
2. **Editing & reopening** – Open project, edit scenes, save, close browser tab, reopen → data restored.
3. **Delete** – Delete confirmation modal → project removed from list and DB.
4. **Rename** – Rename modal works and persists.
5. **Mobile responsiveness** – Layout uses flexible grid, 44px touch targets, safe-area insets; tested via browser devtools (Android viewport).
6. **Accessibility** – Labels, aria attributes, focus styles, error messages with role="alert".
7. **Offline** – Service worker caches core assets.

## Project structure

```
ai-edu-video-factory/
├── index.html          # App shell
├── styles.css          # Responsive dark theme
├── app.js              # All application logic + IndexedDB
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
├── favicon.svg
└── README.md
```

## Data model (IndexedDB)

Store name: `projects`

```js
{
  id: string,
  title: string,
  classLevel: string,
  subject: string,
  language: string,
  animMode: string,
  textContent: string,
  importedFiles: [{ name, type, size, dataUrl? }],
  scenes: [{ id, title, content, notes }],
  createdAt: number,
  updatedAt: number
}
```

## Next phases (out of scope)

- AI script / storyboard generation
- Animation timeline & renderer
- Export to video
- Cloud sync / multi-device

---

Stop after Phase 1. No paid AI services connected.
