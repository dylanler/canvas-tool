## Canvas Research Tool — Lightweight PRD

### Goal
Create a Next.js web app that lets researchers (e.g., finance analysts) collect screenshots/charts, annotate, and converse with an AI assistant about the content on a visual canvas.

### Core Use Cases
- Capture insights: drag/drop or paste images (news screenshots, charts, price snaps) onto a canvas, annotate with text/arrows/shapes, and freehand draw.
- Multi-canvas workflow: create multiple canvases and switch between them while researching separate topics or days.
- Ask AI about a canvas: in chat, mention a canvas with `@CanvasName` to send an exported image of that canvas to the AI for analysis.
- Bring your own model: user can input an OpenAI-compatible Base URL, API Key, and Model; otherwise read from `.env`.

### Non-Goals (MVP)
- Realtime multi-user collaboration.
- Back-end database. Local persistence only (IndexedDB via tldraw `persistenceKey`).
- Image OCR, web capture, or stock data fetching tools. Users provide images manually.

### Architecture
- Web: Next.js (App Router, TS, Tailwind).
- Canvas: `tldraw` React component with `persistenceKey` per canvas; multiple canvases managed in client state; export via `Editor.toImage()`.
- Chat: Vercel AI SDK (`@ai-sdk/react`, `ai`, `@ai-sdk/openai`). Server route `/api/chat` streams responses. Provider is created dynamically from env or request overrides `{ baseURL, apiKey, model }`.
- Storage: Local only (IndexedDB for canvases; `localStorage` for chat provider overrides).

### Key Interactions
- Add Canvas: creates a new tldraw store and persistence key. Can rename canvases.
- Mention to attach image: typing `@` shows canvas suggestions; on send, the app exports the mentioned canvas(es) to PNG and adds them as image parts in the chat message.
- Settings: toggle to use custom provider; inputs for Base URL, API Key (masked), and Model.

### Success Criteria
- Smooth drawing/annotation UX (tldraw defaults).
- Canvas export to image works and is delivered to the chat API.
- Chat streams responses using Vercel AI SDK.
- Users can switch between canvases and persist across refreshes.

### Risks / Constraints
- Exporting canvases not currently mounted: we will mount a hidden tldraw instance just-in-time for export to avoid switching user focus.
- Provider secrets are user-supplied; they live only in the browser and are sent to `/api/chat` per request.

### Future Enhancements
- Collaboration via `@tldraw/sync`.
- RAG over canvas text/objects rather than image export.
- Built-in screenshot tool and data fetch integrations.


