# AI Education Video Factory

Local-first Progressive Web App for creating educational video lessons.
Works offline. Data stays in the browser (IndexedDB).

## Phases

- **Phase 1** – Projects, editor, storyboard, PDF import
- **Phase 2** – Lesson Engine (AI-assisted structure, EN/BN, vocab, MCQ)
- **Phase 3** – Animation Studio (7 modes, playback, scene editing)
- **Phase 4.1** – Browser video export (Canvas + MediaRecorder → WebM)

## Quick start

Serve the repo root over HTTP (required for modules + service worker):

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Phase 4.1 – Video Export

Browser-based educational video rendering (no paid APIs, offline).

### How to export
1. Open a project → **Lesson Engine** → approve lesson (or create scenes manually).
2. **Animation Studio** → generate or edit scenes.
3. Scroll to **Video Export**.
4. Choose resolution (360p / 720p / 1080p), FPS (24 / 30), background, transition.
5. Select scenes → **Render video**.
6. Preview in-page, then **Download** (WebM when supported).

### Technical notes
- Renderer: HTML Canvas + `captureStream` + `MediaRecorder`.
- Formats: WebM (VP9/VP8) preferred; falls back to whatever `MediaRecorder.isTypeSupported` allows.
- Timeline is deterministic (export clock, not UI rAF speed).
- Cancel stops recording; resources (tracks, object URLs) are released.
- Requires a browser with MediaRecorder and canvas captureStream (Chrome / Edge / Firefox).
- Long 1080p lessons may need more memory; lower resolution if the device struggles.
- Large modules (app, animation-engine, video-export) are gzip+base64 chunked and loaded via loaders for GitHub size limits.

### Not in 4.1
- Server-side encoding
- MP4 transcode (no renaming WebM → MP4)
- Narration audio track (planned later)

## Animation modes (Phase 3)

Whiteboard, Classroom, Diagram, Timeline, Text & Vocabulary, Math Steps, Science Process.

## Data

IndexedDB `ai-edu-video-factory` — projects store scenes, lessonData, animationData (additive migrations only).
