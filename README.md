# AI Education Video Factory

Local-first Progressive Web App for creating educational video lessons.
Works offline. Data stays in the browser (IndexedDB).

## Phases

- **Phase 1** – Projects, editor, storyboard, PDF import
- **Phase 2** – Lesson Engine (AI-assisted structure, EN/BN, vocab, MCQ)
- **Phase 3** – Animation Studio (7 modes, playback, scene editing)
- **Phase 4.1** – Browser video export (Canvas + MediaRecorder → WebM)
- **Phase 4.2** – Bilingual narration (EN/BN scripts, TTS preview, upload/record, export mix)
- **Phase 4.3** – Presentation tools (opening title, closing screen, captions, highlighting, branding)

## Quick start

Serve the repo root over HTTP (required for modules + service worker):

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Phase 4.2 – Narration

Per-scene English and Bengali scripts, timing, and optional audio.

### What works offline
- Edit EN/BN narration scripts (Unicode preserved).
- Browser **speech preview** when the OS/browser has voices (Bengali only if a Bengali voice is installed — not assumed).
- **Upload** or **mic-record** audio and store blobs in IndexedDB (`narration-audio`).
- **Export with narration** mixes uploaded/recorded clips onto the WebM timeline via Web Audio API when the browser supports it.
- Mute / volume / start offset / end pause controls.
- Enable or disable narration on export.

### Important limits
- **Browser speech synthesis is preview-only.** It does not produce a downloadable file and is **not** embedded in the exported video.
- Only **uploaded or recorded** audio is mixed into the export.
- If MediaRecorder cannot capture video+audio together, export continues as video-only and the UI states that limitation.
- Do not treat auto-filled scripts as verified translations; teachers edit all narration before export.


## Phase 4.3 – Presentation Tools

Professional presentation controls for educational video export.

### Opening title
Configure lesson title, class, subject, chapter, teacher/institution name (never hard-coded), duration, background, and layout. Optional.

### Closing screen
Summary, key learning points, practice questions, thank-you message, optional institution branding.

### Captions
Editable captions generated from **scene display text and narration scripts** (not from audio). English, Bengali, or both. Size, position, box/outline styles. Scene-level overrides. Long lines wrap and stay inside the frame; Bengali uses system / Noto fonts when available.

### Highlighting
Vocabulary, definitions, math results, dates, science terms, exam tips — pulled from lesson data when present, plus custom terms.

### Branding
Optional institution name, logo upload (stored as data URL in the project), footer on scenes, show on opening/closing.

### Persistence
All settings live on `animationData.presentation` and survive reloads with the animation project.

### Export
Opening and closing segments are part of the export timeline. Captions, highlights, and branding are drawn onto each frame. Narration mix from Phase 4.2 still applies when enabled.

## Phase 4.1 – Video Export

Browser-based educational video rendering (no paid APIs, offline).

### How to export
1. Open a project → **Lesson Engine** → approve lesson (or create scenes manually).
2. **Animation Studio** → generate or edit scenes → set narration if desired.
3. Scroll to **Video Export**.
4. Choose resolution / FPS / background / transition; optionally include narration audio.
5. Select scenes → **Render video**.
6. Preview in-page, then **Download** (WebM when supported).

### Technical notes
- Renderer: HTML Canvas + `captureStream` + `MediaRecorder`.
- Narration mix: Web Audio API → MediaStreamDestination → combined MediaStream.
- Timeline is deterministic (export clock).
- Source modules are split into part files and assembled at runtime for GitHub size limits.

## Animation modes (Phase 3)

Whiteboard, Classroom, Diagram, Timeline, Text & Vocabulary, Math Steps, Science Process.

## Data

IndexedDB `ai-edu-video-factory` (v4):

- `projects` — scenes, lessonData, animationData (additive migrations only).
- `narration-audio` — uploaded/recorded audio blobs referenced by scene narration metadata.
