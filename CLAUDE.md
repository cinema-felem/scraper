# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build                  # tsc + tsc-alias + sentry sourcemaps → dist/
npm run scrape [chain]         # build + run scraper (all chains, or one: gv/shaw/carnival/eaglewing/filmhouse/sfs)
npm run transform [chain]      # build + normalize + merge (omit chain to process all and write merge.json)
npm run storage [step]         # build + insert into DB (steps: cinemas | movies | showtimes)
npm run metadata               # build + enrich from TMDB/OMDB/Trakt/Letterboxd/Google Maps
npm run prisma:generate        # regenerate Prisma client after schema changes
npm run prisma:migrate         # run pending migrations
```

Type-checking without building:
```bash
node_modules/.bin/tsc --noEmit
```

## Pipeline Architecture

Four sequential stages, each reads/writes JSON files or the database:

```
Scrape → data/raw/{chain}.json
Transform → data/intermediate/{chain}.json + merge.json
Storage → PostgreSQL (via Prisma)
Metadata → data/metadata/ + enriches DB records
```

**Scrape** (`src/scrape.ts`): imports each chain's `index.ts`, calls `fetchMovies()` / `fetchCinemas()` / `fetchShowtimes()`, writes `data/raw/{chain}.json`. Runs sequentially with a 2s delay between chains to avoid Selenium conflicts.

**Transform** (`src/transform.ts`): dynamically `require()`s the compiled `dist/scripts/transform/{chain}.js`, calls `standardiseCinemaChain(raw)` on each chain's raw JSON, writes per-chain intermediate files, then merges all into `data/intermediate/merge.json`. Strips movies that have no associated showtimes.

**Storage** (`src/storage.ts`): reads `merge.json`, upserts cinemas, inserts movies with deduplication (via `titleVariations[]` and `movieIds[]` arrays), inserts showtimes with FK validation, then removes orphaned movies.

**Metadata** (`src/metadata.ts`): enriches stored Movie records with TMDB/OMDB data. Uses OpenRouter (free LLM models) to normalize unmatched titles before retrying TMDB search.

## Adding or Fixing a Cinema Chain

Each chain lives under `src/scripts/scrape/{chain}/` with:
- `index.ts` — exports `fetchMovies()`, `fetchCinemas()`, `fetchShowtimes()`
- `scrape.ts` — HTTP calls and HTML/API parsing
- `types.ts` — chain-specific raw interfaces

The corresponding transform is `src/scripts/transform/{chain}.ts`, which exports a single function:
```typescript
module.exports = { standardiseCinemaChain }
```

`standardiseCinemaChain` receives the raw `{ movies, cinemas, showtimes }` object and returns the same shape with each array converted to `StandardMovie[]`, `StandardCinema[]`, `StandardShowtime[]`.

## Standard Types (`src/types/standard.ts`)

```typescript
StandardMovie   { id, filmTitle, language, format, source: { chain, id, details } }
StandardCinema  { id, name, searchableName, source: { chain, id, details } }
StandardShowtime { id, filmId, cinemaId, unixTime, link, ticketType, movieFormat, details }
```

`filmId` and `cinemaId` in `StandardShowtime` must reference `StandardMovie.id` and `StandardCinema.id` within the same chain — the storage layer validates these FKs.

## TypeScript Path Alias

`@/` maps to `src/`. Use `import { X } from '@/types/standard'` instead of relative paths.

## CI/CD

`.github/workflows/daily-scrape.yml` runs the full pipeline at 4 AM SGT (UTC 20:00) daily with a 45-minute timeout on the scrape step. Artifacts (`data/raw/`, `data/intermediate/`, `data/metadata/`) are retained for 7 days.

`.github/workflows/test-scrape.yml` is a manual workflow for testing individual chains.

## Scraper Approaches by Chain

| Chain | Method |
|---|---|
| GV | REST API (no auth) |
| Shaw | `/internal/*` endpoints — requires `x-api-forward-to: internal` + `x-app: PWSM` headers |
| Carnival | REST API — token generated via HMAC-SHA256 (see `scrape.ts:generateToken`); location param is `Mumbai` |
| EagleWings | Selenium — reads CSRF from meta tag + cookies, then Node fetch for `/api/v1/film/showings` + POST `/api/v1/film/time-scheduled` with `window.Vars.ScheduledFilmId` per movie page |
| Filmhouse | Selenium — server-rendered HTML on `filmhouse.sg/films/`, parses Jacro TaPoS plugin markup |
| SFS | Selenium — scrapes homepage film sections + visits each Peatix subdomain event page for session times |
