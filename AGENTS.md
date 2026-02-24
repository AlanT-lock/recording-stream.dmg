# Slide Recorder

100% client-side screen recording web app (vanilla JS + Vite). No backend, no database, no Docker.

## Cursor Cloud specific instructions

### Running the app

- `npm run dev` starts the Vite dev server at `http://localhost:5173`
- Two HTML entry points: `index.html` (recorder) and `editor.html` (video editor, requires `?id=` query param from IndexedDB)
- The editor page redirects to the main page if no valid video ID is provided

### Key caveats

- **No linter or test framework configured** — there is no ESLint, Prettier, or test runner in this project
- **No environment variables required** — the only optional env var is `VITE_DOWNLOAD_URL` (used only during production build for macOS DMG download link)
- **Screen recording requires browser permissions** — the Cloud VM environment lacks real webcam/microphone hardware, so screen capture and camera preview will show permission errors. The screen share picker dialog _does_ appear when clicking "Démarrer l'enregistrement"
- **Electron commands are macOS-only** — `npm run electron:dev` and `npm run electron:build` target macOS and won't work in the Linux Cloud VM
- **CDN dependencies at runtime** — FFmpeg.wasm and MediaPipe models are fetched from CDN at runtime (not bundled). MP4 export and background blur features require internet access

### Standard commands

See `README.md` for full documentation. Quick reference:
- Dev: `npm run dev`
- Build: `npm run build`
- Preview production build: `npm run preview`
