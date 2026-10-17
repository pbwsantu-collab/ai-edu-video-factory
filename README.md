# AI Education Video Factory

Local-first Progressive Web App for creating educational video lessons.
Works offline. Data stays in the browser (IndexedDB).

**Live:** https://pbwsantu-collab.github.io/ai-edu-video-factory/

## Phases

- **Phase 1** – Projects, editor, storyboard, PDF import
- **Phase 2** – Lesson Engine (AI-assisted structure, EN/BN, vocab, MCQ)
- **Phase 3** – Animation Studio (7 modes, playback, scene editing)
- **Phase 4.1** – Browser video export (Canvas + MediaRecorder → real WebM/MP4)
- **Phase 4.2** – Bilingual narration (EN/BN scripts, TTS preview, upload/record, export mix)
- **Phase 4.3** – Presentation tools (opening title, closing screen, captions, highlighting, branding)

## Quick start (local)

Serve the repo root over HTTP (modules + service worker require it):

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

For GitHub Pages, open the live URL above after Pages has built.

## Browser requirements

| Feature | Chrome / Edge | Firefox | Safari |
|--------|---------------|---------|--------|
| PWA / offline | Yes | Yes | Limited |
| Animation Studio | Yes | Yes | Yes |
| MediaRecorder video | WebM (VP8/VP9) | WebM (VP8) | MP4 when available; WebM on recent versions |
| Narration mix (Web Audio) | Yes | Yes | Yes when supported |
| Bengali text | System / Noto fonts | Same | Same |

**Recommended:** up-to-date Chrome, Edge, or Firefox on desktop. Android Chrome works for export; keep the tab active.

## Phase 4 – Video export

### Supported formats (honest detection)

Export uses `MediaRecorder.isTypeSupported()` at runtime:

1. `video/webm;codecs=vp9,opus` / `vp9` / `vp8,opus` / `vp8` / plain `video/webm`
2. Only if supported: `video/mp4` (with AVC/AAC codec strings when available)

- The download extension is **`.webm` or `.mp4` matching the real MIME**. Extensions are never renamed to pretend conversion.
- There is **no server-side transcoding** and no client-side MP4 converter library. If the browser cannot encode MP4, you get WebM.
- **WebM** plays in Chrome, Firefox, Edge, and many Android apps. Safari playback of WebM depends on OS/version; use a player that supports WebM or export on a browser that offers real MP4 encoding.

### Quality options

- Resolutions: **640×360**, **1280×720** (default), **1920×1080**
- Frame rates: **24 FPS**, **30 FPS**
- Backgrounds and scene transitions (none / fade / cut)
- Encoder support is checked **before** recording starts

Warnings appear for long timelines, 1080p on long lessons, and high frame counts. Cancel is always available.

### Progress and recovery

During export the UI shows:

- Progress percent (timeline-based, not fake)
- Current segment (opening / scene N / transition / closing)
- Wall-clock **elapsed** time
- **Estimated remaining** time only after enough progress (~8% and ≥2s) for a grounded estimate
- Cancel (AbortController) — partial streams are stopped and cleaned up
- Success with size, resolution, format label, and a basic playability probe
- Download of the real blob

### Validation (client-side)

After recording, the app checks:

- Non-empty blob
- MIME is `video/webm` or `video/mp4`
- Optional metadata probe via a temporary `<video>` element (playable flag, duration comparison)

**Not automated in CI (browser-only product):** pixel-perfect captions, EN/BN glyph rendering, and audio track presence on every device. Teachers should preview in-page before sharing.

### Performance notes

- Frames are drawn on demand; no full-frame buffer of the whole video
- UI yields between frames so the tab stays responsive
- Streams and object URLs are stopped/revoked after export or cancel
- Keep the tab in the foreground on mobile; background suspension can stall `MediaRecorder`

### Narration (Phase 4.2)

- Edit EN/BN scripts offline (Unicode preserved)
- Browser speech synthesis is **preview only** — not embedded in the file
- **Uploaded or mic-recorded** audio is mixed into the export via Web Audio when available
- Mute / volume / offsets apply to the mix

### Presentation (Phase 4.3)

- Opening title and closing screen on the export timeline
- Captions from scene display text + narration scripts (not from audio)
- Highlight terms and optional institution branding/logo
- All settings persist on `animationData.presentation` in IndexedDB

## Offline / PWA

- Service worker caches the shell
- Projects and narration audio blobs live in IndexedDB (`ai-edu-video-factory`)
- Export never uploads media to a server

## Android notes

- Use Chrome; stay on the export screen until finished
- Prefer 720p for long lessons on mid-range phones
- If export fails with “no data”, retry at 360p or with fewer scenes

## Troubleshooting

| Symptom | What to try |
|--------|-------------|
| “MediaRecorder not supported” | Use Chrome/Edge/Firefox |
| Empty / failed recording | Lower resolution, fewer scenes, ensure tab is active |
| No audio in file | Only uploaded/recorded clips are mixed; enable narration on export |
| WebM won’t open on iPhone | Use a browser/OS that supports WebM, or a browser that encodes real MP4 |
| Bengali looks wrong | Install a Bengali-capable system font; captions use system / Noto when present |
| Stale UI after deploy | Hard refresh or unregister service worker once |

## Data model

IndexedDB `ai-edu-video-factory`:

- `projects` — scenes, lessonData, animationData (including presentation)
- `narration-audio` — uploaded/recorded blobs referenced by scene metadata

## Development notes

Large modules (`animation-engine`, `video-export`, `presentation`) ship as gzip+base64 ES chunks assembled at runtime so GitHub file size limits are respected. Loaders (`animation-engine.js`, `video-export.js`, `presentation.js`) decompress and `import()` the source.

## Definition of done (teacher flow)

1. Open or create a project  
2. Generate/approve a lesson (Phase 2)  
3. Build animated scenes (Phase 3)  
4. Edit storyboard and narration  
5. Configure captions / title / closing  
6. Preview  
7. Export a **real** WebM (or MP4 when the browser encodes it)  
8. Download and play  
9. Reload the PWA — edits remain in IndexedDB  
