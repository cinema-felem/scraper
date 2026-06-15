---
name: cinema-data-pipeline
description: Run, debug, or update the end-to-end cinema data pipeline in the cinema-felem scraper repository. Use when coordinating scrape, transform, storage, and metadata stages; deciding which npm command to run; inspecting data/raw, data/intermediate, data/permutation, or data/metadata artifacts; validating pipeline handoffs; triaging data drops between stages; or documenting runtime API key and database requirements.
---

# Cinema Data Pipeline

## Pipeline Shape

The runtime pipeline is:

```text
Scrape -> Transform -> Storage -> Metadata
```

Stage outputs are file or database handoffs:

```text
Scrape    -> data/raw/<chain>.json
Transform -> data/intermediate/<chain>.json and data/intermediate/merge.json
Storage   -> PostgreSQL through Prisma
Metadata  -> data/metadata/movies.json and enriched DB records
```

Use local code and generated artifacts as authoritative. DeepWiki is useful for orientation, but local paths and commands win when they disagree.

## Commands

Use these commands from the repository root:

```bash
npm run scrape [chain]
npm run transform [chain]
npm run storage [cinemas|movies|showtimes|updates]
npm run metadata [cinemas|movies]
```

Quality checks:

```bash
npx tsc --noEmit
npm run lint
npm test
```

`npm run scrape` and `npm run transform` compile first. `npm run storage` and `npm run metadata` also compile before executing their stage entry points.

## Key Requirements

Scrape and transform can often run without API keys, depending on the chain.

Storage requires a safe database target:

```text
DATABASE_URL
DIRECT_URL
```

Metadata may require:

```text
GMAP_API_KEY
TRAKT_CLIENT_ID
TRAKT_CLIENT_SECRET
OMDB_API_KEY
TMDB_API_KEY
OPENROUTER_API_KEY
```

Sentry integration may use:

```text
SENTRY_AUTH_TOKEN
SENTRY_DSN
```

Do not run DB-mutating stages against production unless the user explicitly requests it. If keys or a safe DB are unavailable, validate earlier stages and report exactly which runtime checks were skipped.

## Stage Handoff Checks

When debugging the pipeline, prove each handoff before moving downstream:

1. After scrape, inspect `data/raw/<chain>.json` for `movies`, `cinemas`, and `showtimes` arrays.
2. After transform, inspect `data/intermediate/<chain>.json` for standard IDs, positive `unixTime`, and valid showtime references.
3. After all transforms, inspect `data/intermediate/merge.json` for unexpected drops after unused movies are cleaned.
4. Before storage, confirm the DB target is safe and Prisma client is current.
5. After metadata, inspect `data/metadata/movies.json` and logs for unmatched titles, missing ratings, or failed wrapper calls.

Use `$cinema-scraper-chain` for source extraction issues, `$cinema-transform-normalizer` for raw-to-standard issues, `$cinema-storage-metadata` for DB or metadata issues, and `$cinema-pipeline-ci` for GitHub Actions issues.

## Failure Triage

Follow the data flow instead of guessing:

- Missing raw file: scraper did not run, chain is unregistered, or upstream failed before write.
- Empty raw arrays: upstream source changed, request failed, selectors drifted, or chain has no current showtimes.
- Transform module load failure: compiled `dist/scripts/transform/<chain>.js` is missing or export shape is wrong.
- Lost movies after merge: showtimes do not reference transformed movie IDs.
- Storage FK failures: transformed movie or cinema IDs do not exist in the DB insertion sequence.
- Metadata misses: TMDB search failed, title normalization failed, wrapper credentials are missing, or an external API changed.

## Safe Runtime Strategy

For chain work, run the smallest complete slice:

```bash
npm run scrape <chain>
npm run transform <chain>
```

For all-chain artifact checks:

```bash
npm run scrape
npm run transform
```

For DB and metadata checks, prefer a development database and targeted stages:

```bash
npm run storage cinemas
npm run storage movies
npm run storage showtimes
npm run metadata movies
npm run metadata cinemas
```

Record counts at each stage and compare them with expectations. A passing command with zero movies or zero showtimes may still be a functional failure for an active chain.
