---
name: cinema-storage-metadata
description: Maintain storage, database, Prisma, and metadata enrichment stages in the cinema-felem scraper repository. Use when working on src/storage.ts, src/metadata.ts, src/scripts/storage, src/scripts/metadata, Prisma schema or migrations, movie deduplication, showtime insertion, metadata wrappers for TMDB, OMDB, Trakt, Letterboxd, OpenRouter, Google Maps cinema context, data/metadata output, or database update scripts.
---

# Cinema Storage Metadata

## Safety First

Storage and metadata commands can mutate the database named by `.env`. Before running `npm run storage`, `npm run metadata`, Prisma migrations, or ad hoc Prisma scripts, inspect the target environment and avoid production writes unless the user explicitly asked for them.

Never commit secrets. Required credentials are declared in `.env.example` and injected in CI through GitHub Secrets.

## Storage Workflow

`src/storage.ts` reads:

```text
data/intermediate/merge.json
```

and runs these steps:

```text
cinemas -> movies -> showtimes -> updates
```

The command surface is:

```bash
npm run storage
npm run storage cinemas
npm run storage movies
npm run storage showtimes
npm run storage updates
```

Maintain these invariants:

- Cinema upserts preserve stable `StandardCinema.id` and `searchableName`.
- Movie insertion keeps deduplication behavior based on title variations and source IDs.
- Showtime insertion validates referenced movie and cinema records before insert.
- Updates remove orphaned movies and keep configured database fixes explicit in `src/scripts/storage/updates.ts`.

When changing storage behavior, inspect the standard types in `src/types/standard.ts` and the Prisma schema in `prisma/schema.prisma` together.

## Metadata Workflow

`src/metadata.ts` supports:

```bash
npm run metadata
npm run metadata cinemas
npm run metadata movies
```

Movie metadata lives under `src/scripts/metadata/movies.ts` and wrappers in `src/scripts/metadata/wrapper/`. Cinema context lives in `src/scripts/metadata/cinemas.ts`.

Preserve the metadata fallback behavior:

- TMDB is the primary movie metadata source.
- OMDB, Trakt, and Letterboxd contribute ratings and external context.
- OpenRouter normalizes unmatched movie titles before TMDB retry.
- JSON returned by model calls must be parsed defensively and logged on failure.
- Metadata output is written to `data/metadata/movies.json`.

Use Context7 for current Prisma or SDK API details when signatures or migration behavior matter.

## Prisma Changes

When changing `prisma/schema.prisma`:

1. Update code that reads or writes affected models.
2. Create or adjust migrations deliberately.
3. Regenerate the Prisma client.

Use:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Run migrations only against the intended development database unless the user explicitly requests otherwise.

## Validation

For code-only changes:

```bash
npx tsc --noEmit
npm run lint
npm test
```

For DB-affecting changes, add the narrowest safe runtime check against a known development database, such as:

```bash
npm run storage <step>
npm run metadata <step>
```

Report clearly when DB or external API validation was skipped because credentials or a safe database were unavailable. Use `$cinema-data-pipeline` when validating full-stage handoffs before storage or metadata.
