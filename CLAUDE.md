# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build
npm run start      # Serve the production build
npm run typecheck  # Generate route types + TypeScript check
```

No test runner is configured.

## Architecture

**BINMATE** is a full-stack SSR app for tracking recycling containers, built with React Router 7 (framework mode).

### Stack
- **React Router 7** — SSR framework (replaces Remix); handles routing, data loading, and server actions
- **SQLite + better-sqlite3** — single-file database; path configurable via `DB_PATH` env var
- **TailwindCSS 4** — styling
- **motion** — UI animations
- **Vite** — build tool with HMR

### Route Structure
```
/            → app/routes/home.tsx       (container list + register)
/:containerId → app/routes/container.tsx  (container detail, mark full/empty, map, QR)
```

### Data Flow
React Router loaders and actions handle all server/client interaction. Each route file exports a `loader` (data fetching) and/or `action` (mutations) that run server-side. No separate API layer.

### Database
All DB operations are in `app/db/sqlite.ts`. The `containers` table stores: `id`, `code` (unique 5-char alphanumeric), `lat`, `lng`, `isFull` (0/1), `type` (paper/plastic/glass/mixed).

### Key Utilities
- `app/utils/generateId.ts` — generates unique 5-char container codes (excludes I/O)
- `app/utils/haversineKm.ts` — great-circle distance for finding nearby containers
- `app/types/definitions.d.ts` — shared TypeScript types

### Path Aliases
`~/*` maps to `app/*` (configured in tsconfig and vite).

### Deployment
Hosted on a self-managed server via Coolify. Auto-deploys when the GitHub repo is updated. Docker multi-stage build (`Dockerfile`) is used for containerization.

### Maps
The container detail page shows a map — Google Maps if `GOOGLE_MAPS_API_KEY` env var is set, otherwise falls back to OpenStreetMap static tiles.
