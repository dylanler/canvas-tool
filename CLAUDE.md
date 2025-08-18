# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema changes
npx prisma db push

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture Overview

This is a multi-user Next.js 15 app that combines tldraw canvas editing with AI chat assistance. The architecture uses PostgreSQL database persistence with NextAuth.js authentication:

### Core Components

- **Authentication (`src/lib/auth.ts`)**: NextAuth.js with credentials provider and Prisma adapter
- **Main App (`src/app/page.tsx`)**: Manages user-specific canvas tabs and chat sessions with database sync
- **Canvas System**: Uses tldraw with database-backed persistence, auto-syncing changes every 2 seconds
- **Chat Assistant (`src/components/ChatAssistant.tsx`)**: Handles AI conversations with database-persisted history
- **Canvas Sidebar (`src/components/CanvasSidebar.tsx`)**: Manages user's canvas list with database operations
- **Auth Wrapper (`src/components/AuthWrapper.tsx`)**: Protects app routes and shows user info

### Database Schema

- **Users**: Authentication and profile data
- **Canvases**: Per-user canvas storage with tldraw data and metadata
- **ChatSessions**: Per-user chat conversations
- **ChatMessages**: Message history with rich content support
- **ProviderSettings**: User-specific AI provider configurations

### Key Functionality

- **Multi-user Support**: Each user has isolated canvases and chat history
- **Canvas @mentions**: Type `@CanvasName` in chat to attach PNG exports of canvases to messages
- **Database Persistence**: All user data persists in PostgreSQL via Prisma
- **Auto-sync**: Canvas changes automatically sync to database with 2-second debounce
- **Provider Settings**: Users can configure custom AI providers (saved to database)

### API Routes

- `/api/auth/[...nextauth]`: NextAuth.js authentication
- `/api/canvases`: CRUD operations for user canvases
- `/api/chat-sessions`: CRUD operations for chat sessions
- `/api/chat-sessions/[id]/messages`: Message history management
- `/api/chat`: Streaming chat with user-specific provider settings
- `/api/user/provider-settings`: User AI provider configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://...    # Required: Neon PostgreSQL connection
NEXTAUTH_SECRET=...             # Required: NextAuth.js secret
NEXTAUTH_URL=http://localhost:3000  # Required: App URL

OPENAI_API_KEY=sk-...           # Optional: Default AI provider
OPENAI_MODEL=claude-sonnet-4-20250514  # Optional: Default model
OPENAI_BASE_URL=https://api.anthropic.com/v1/  # Optional: Custom endpoint
```

## Tech Stack

- Next.js 15 (App Router) + React 19
- NextAuth.js for authentication
- Prisma ORM with PostgreSQL (Neon)
- tldraw 3.15.x for canvas editing
- Vercel AI SDK for chat streaming
- Tailwind CSS v4 for styling
- pdf-lib for multi-canvas PDF export

## Database Provider

Using Neon PostgreSQL. The database URL should be configured in `.env` with proper SSL settings for Neon.