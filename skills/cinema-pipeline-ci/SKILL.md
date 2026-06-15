---
name: cinema-pipeline-ci
description: Maintain CI, GitHub Actions, scheduled scraper operations, pipeline commands, artifact handling, and validation workflows for the cinema-felem scraper repository. Use when editing .github/workflows, daily scrape scheduling, manual scrape tests, chain test matrices, Node or Playwright setup in CI, GitHub Secrets usage, artifact retention, timeout behavior, or pipeline failure triage.
---

# Cinema Pipeline CI

## Workflow Files

The authoritative workflows are:

```text
.github/workflows/daily-scrape.yml
.github/workflows/test-scrape.yml
```

Use current GitHub Actions docs when changing action syntax, permissions, caching, or matrix behavior. Use `$cinema-data-pipeline` for local runtime stage order, artifact handoffs, and data-drop triage.

## Daily Pipeline

`daily-scrape.yml` runs at 20:00 UTC, which is 04:00 Singapore time, and can also be triggered manually.

The production order is:

```text
npm ci
npx tsc --noEmit
npm run lint
npx playwright install chromium --with-deps
npm run prisma:generate
npm run build
npm run scrape
npm run transform
npm run storage
npm run metadata
```

It uploads `data/raw/`, `data/intermediate/`, and `data/metadata/` artifacts for debugging. Keep artifact retention short unless the user asks otherwise.

## Test Scrape Workflow

`test-scrape.yml` runs on pull requests that affect scraper or transform code and has a manual `chain` input. Its matrix should include every registered chain that is expected to be testable in CI.

When adding a cinema chain:

1. Add the chain to `src/types/chains.ts`.
2. Add the scraper module to `src/scrape.ts`.
3. Add the chain to `test-scrape.yml` unless it is intentionally not CI-testable.
4. Confirm the transform exists and can run from compiled `dist`.
5. Ensure raw artifacts are uploaded even on failure.

If a chain is intentionally excluded from the PR matrix, document the reason in the workflow or related change.

## Secrets And Environment

Do not hardcode credentials. The workflows use GitHub Secrets for:

```text
DATABASE_URL
DIRECT_URL
GMAP_API_KEY
TRAKT_CLIENT_ID
TRAKT_CLIENT_SECRET
OMDB_API_KEY
TMDB_API_KEY
OPENROUTER_API_KEY
SENTRY_DSN
SENTRY_AUTH_TOKEN
```

Metadata-specific secrets should be scoped to the metadata step when possible.

## Failure Triage

For CI failures, identify the failing stage before editing:

- Type or lint failures usually indicate code quality issues.
- Playwright install or browser failures are environment issues.
- Scrape failures should be checked against raw artifact counts and upstream source availability.
- Transform failures usually indicate raw contract drift or missing compiled transform modules.
- Storage and metadata failures may depend on secrets, database connectivity, or external API behavior.

## Validation

After workflow edits, run local checks that match the changed surface:

```bash
npx tsc --noEmit
npm run lint
npm test
```

If `actionlint` is available, run it against changed workflow files:

```bash
actionlint .github/workflows/daily-scrape.yml .github/workflows/test-scrape.yml
```

If `actionlint` is unavailable, state that workflow syntax validation was not available and rely on careful YAML inspection plus local command validation.
