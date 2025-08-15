## Canvas Chat

Modern canvas + chat assistant built with Next.js 15, React 19, Tailwind CSS v4, and tldraw. Create multiple canvases, persist your work locally, and chat with an assistant. Mention canvases with `@Canvas Name` to attach an image snapshot to your message.

### Features
- **Multi-canvas workspaces** with rename/delete and local persistence
- **tldraw** editor with automatic persistence in IndexedDB
- **Chat assistant** that supports attaching canvases via `@mentions`
- **LLM provider flexibility**: use default OpenAI via env vars or bring your own OpenAI-compatible provider from the UI (base URL, API key, model)
- **No server database**: all canvas data is stored locally in the browser

---

## Requirements
- Node.js 18.18+ (or 20+ recommended)
- npm 9+ (or use your preferred package manager)

If using the default OpenAI provider, you will also need an API key.

---

## Environment Variables

Create a `.env.local` in the project root when running locally and set any of the following as needed:

```bash
# Required only if using the default OpenAI provider from the server route
OPENAI_API_KEY=sk-...

# Optional: default model used by the server route when not overridden by the client
# Fallback default is "gpt-5-mini" if not provided
OPENAI_MODEL=gpt-4o-mini
```

Notes:
- If you don’t want to set environment variables, you can toggle "Use custom provider" in the chat UI and supply a base URL, API key, and model at runtime. These settings are stored in `sessionStorage` for the browser session.
- The server route at `src/app/api/chat/route.ts` uses the default OpenAI provider when `OPENAI_API_KEY` is present, and will stream responses from `OPENAI_MODEL` (or `gpt-5-mini` by default). You can also override provider details per-request using headers set by the client UI.

---

## Local Development

1) Install dependencies:
```bash
npm install
```

2) (Optional) Create `.env.local` with `OPENAI_API_KEY` and `OPENAI_MODEL` (see above).

3) Start the dev server:
```bash
npm run dev
```

4) Open `http://localhost:3000`.

Tips while developing:
- Use the "Reset" button in the UI to clear local persistence and start fresh (clears canvas list, creates a new session, and best-effort purges tldraw DBs).
- You can switch to a custom OpenAI-compatible provider from the chat toolbar by checking "Use custom provider".

---

## Production Build & Start (Generic Node Hosting)

1) Build the app:
```bash
npm run build
```

2) Start the production server:
```bash
npm run start
```

3) Ensure environment variables are provided in your hosting environment (e.g., `OPENAI_API_KEY`, `OPENAI_MODEL`). The server listens on port `3000` by default; expose or proxy that port from your platform.

---

## Deploying on Vercel

You can deploy in two ways: Git integration or CLI.

### A) Git Integration (recommended)
1) Push this repository to GitHub/GitLab/Bitbucket
2) Import the repo in Vercel
3) Set Environment Variables in Vercel Project Settings:
   - `OPENAI_API_KEY` (if using default OpenAI provider)
   - `OPENAI_MODEL` (optional)
4) Deploy. Vercel will run `npm run build` and serve the app.

### B) Vercel CLI
```bash
# Install CLI if needed
npm i -g vercel

# From the project root
vercel

# For production
vercel --prod
```
Remember to add the same environment variables in the Vercel dashboard or via `vercel env`.

---

## Deploying to Other Hosts

Most Node hosts work out of the box:

1) Build the project on your CI or host:
```bash
npm ci
npm run build
```

2) Run the server:
```bash
npm run start
```

3) Configure environment variables (`OPENAI_API_KEY`, `OPENAI_MODEL`) in your platform’s env settings.

### Example Dockerfile (optional)
If you prefer containers, here’s a minimal example you can adapt:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json .
RUN npm i --omit=dev && adduser -D appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Provide `OPENAI_API_KEY` and `OPENAI_MODEL` through your orchestrator’s secret/env mechanism.

---

## Tech Stack
- **Next.js 15 (App Router)**
- **React 19**
- **Tailwind CSS v4**
- **tldraw 3.15.x**
- **Vercel AI SDK (ai, @ai-sdk/react, @ai-sdk/openai)**

Key files:
- UI Shell: `src/app/layout.tsx`
- Main App: `src/app/page.tsx`
- Chat UI: `src/components/ChatAssistant.tsx`
- Chat API Route (streaming): `src/app/api/chat/route.ts`
- Canvas Sidebar: `src/components/CanvasSidebar.tsx`

---

## Scripts
```json
{
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "lint": "next lint"
}
```

If your platform has issues with Turbopack for production builds, you can switch the build script to `next build`.

---

## Troubleshooting
- **401/403 from chat API**: Ensure `OPENAI_API_KEY` is set for server-side default provider, or enable "Use custom provider" in the chat UI and supply your base URL, API key, and model.
- **Stale canvas state**: Click the "Reset" button in the left panel to clear local persistence and start a fresh session.
- **Blank page after deploy**: Check Node version (18.18+ or 20+) and that `npm run build` completed successfully on your host.

---

## License
MIT (or your preferred license)
