# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

La Romana 2026 — a golf tournament scoring app for a 3-round trip to Casa de Campo / Punta Cana, Dominican Republic (April 29 – May 2, 2026). 15 players, 2-team Ryder Cup (singles match play + fourball match play) with parallel individual Stableford and a daily neto side pot. Currency: USD. Mobile-first PWA. Spanish UI.

This codebase started as a copy of the Ryder Cup Par00 app that scored the Nov 2025 Bogotá tournament, then refactored for the La Romana format. The Bogotá deploy is untouched; La Romana runs on its own GCP project and DB.

## Monorepo Structure

npm workspaces with three packages:
- **`packages/api`** — Fastify v4 REST API (TypeScript, PostgreSQL)
- **`packages/web`** — Next.js 14 App Router frontend (React 18, Tailwind CSS v3.4)
- **`packages/shared`** — Shared TypeScript type definitions (no runtime deps)

## Common Commands

### Root
```bash
npm run dev          # Start API in dev mode (ts-node-dev --respawn)
npm run build        # Build all workspaces
npm run test         # Run tests across all workspaces
npm run test:watch   # Tests in watch mode
```

### API (`packages/api`)
```bash
npm run dev          # ts-node-dev --respawn --transpile-only src/index.ts
npm run build        # tsc
npm run test         # vitest run --no-threads
npm run test:watch   # vitest (interactive)
npm run migrate      # ts-node src/scripts/migrate.ts
npm run seed         # ts-node scripts/seed-la-romana.ts
```

### Web (`packages/web`)
```bash
npm run dev          # next dev
npm run build        # next build
npm run lint         # next lint
```

### Running a single API test
```bash
cd packages/api && npx vitest run tests/path/to/test.ts --no-threads
```

## Architecture

### API Layered Pattern
`Routes → Services → Repositories → PostgreSQL`

- **Routes** (`src/routes/`) — HTTP handlers, request validation, auth middleware
- **Services** (`src/services/`) — Business logic
- **Repositories** (`src/repositories/`) — Raw SQL queries via `pg` Pool
- **Scoring Engine** (`src/scoring/`) — singles match play, fourball match play, Stableford (individual net points), tournament aggregation across rounds. Handicap allowance 80% for both singles and fourball.
- **Middleware** (`src/middleware/`) — JWT auth verification, role-based access (`requireOrganizer`, `requireFlightAccess`)

API starts in `src/index.ts` → builds app from `src/app.ts` → runs migrations on startup → listens.

### Web App Structure
- **Pages** use Next.js App Router (`src/app/`)
- **State** via React Context: `AuthProvider`, `SyncProvider`, `EventProvider` (no external state library)
- **Data fetching** via custom hooks in `src/hooks/` using manual fetch/refetch patterns
- **API client** singleton in `src/lib/api.ts` (fetch-based, Bearer token from localStorage)
- **Offline support**: IndexedDB (`src/lib/db.ts`) queues scores offline, `SyncService` (`src/lib/sync.ts`) auto-syncs on reconnect. Mutation IDs ensure idempotent score submissions.
- **Path alias**: `@/*` maps to `./src/*`

### Key Domain Concepts
- **Events** — the tournament (one event: `LR2026`)
- **Rounds** — the three days of play (Apr 29 Teeth of the Dog, May 1 Ocean's Four, May 2 Dye Fore). Each round has its own course and flights.
- **Flights** — groups of 4 players (2 red + 2 blue) playing together within a round. Flights scope to `(event_id, round_id)`.
- **Teams** — two teams, red vs blue. Team names/branding set at event setup. 7 vs 8 players + 1 phantom for even flight counts.
- **Scoring layers (run in parallel):**
  - **Ryder Cup** — team match points from singles + fourball per round, cumulative across rounds
  - **Stableford** — individual net points per round (80% HCP), cumulative
  - **Neto pot** — daily side pot, 2 best-ball per flight, winners recorded manually by organizer
  - **Side pots** — Longest Drive and Closest to Pin on designated holes per round
- **Spectator tokens** — public read-only leaderboard access without auth

### Player Avatars & Winner Assets
- Avatar images: `packages/web/public/images/{normalized-name}.webp` (e.g. `pulido.webp`)
- Winner avatars (optional): `{name}-winner.webp` (e.g. `pulido-winner.webp`) — shown when a player wins a match. Falls back to normal avatar if missing.
- Winner star badge: `packages/web/public/images/winner-star2.webp` — gold star with glow, displayed on winner's avatar corner
- Name normalization: first name → lowercase → strip accents → alphanumeric only (see `normalizeName()` in `MatchCard.tsx`)

## Database

PostgreSQL via `pg` Pool. Migrations are SQL files in `packages/api/migrations/`, run via `postgres-migrations` automatically on API startup. Migration `024_la_romana.sql` refactored the Bogotá-era schema: added `rounds`, scoped flights/scores to rounds, dropped scramble tables and 9+9 segment states.

### Required Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `DATABASE_URL_TEST` — Test database (used when `NODE_ENV=test`)
- `JWT_SECRET` — JWT signing key (defaults to `'supersecret'` in dev)
- `NEXT_PUBLIC_API_URL` — API URL for the web frontend

## Testing

API tests in `packages/api/tests/` use Vitest + Fastify `inject()` for in-memory HTTP testing. Tests require a running PostgreSQL instance with `DATABASE_URL_TEST`. No web component tests yet.

## Deployment

Google Cloud Run via `cloudbuild.yaml`. La Romana deploys to its own GCP project (separate from the Bogotá app). Docker images built with Node 20 Alpine. API exposes port 3002, Web (standalone Next.js) exposes port 3000.

## TypeScript

All packages use strict mode. API targets ES2020/CommonJS. Web targets ESNext/bundler. Shared targets ES2020/CommonJS.
