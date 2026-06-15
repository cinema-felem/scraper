---
name: cinema-scraper-chain
description: Add, fix, or investigate cinema chain scrapers in the cinema-felem scraper repository. Use when working on chain folders under src/scripts/scrape, raw cinema/movie/showtime types, API or HTML extraction, Playwright scraping, chain registration in src/types/chains.ts or src/scrape.ts, raw output files in data/raw, or scraper failures for a specific cinema chain.
---

# Cinema Scraper Chain

## Workflow

Start from the repository root. Treat local files as authoritative; DeepWiki may help with orientation, but it can contain stale path names.

1. Identify whether the work is for an existing chain or a new chain.
2. Inspect the closest existing chain implementation before editing. Prefer chains with the same source shape: REST API, server-rendered HTML, or Playwright.
3. Implement or update the scraper under `src/scripts/scrape/<chain>/`.
4. If adding a chain, register it in both `src/types/chains.ts` and the `scraperModules` map in `src/scrape.ts`.
5. Confirm the matching transform exists or hand off to `$cinema-transform-normalizer`.
6. Run focused validation before broad validation, or use `$cinema-data-pipeline` for end-to-end stage checks.

## Scraper Module Contract

Each chain directory should expose these functions from `index.ts`:

```ts
export const fetchMovies = async (): Promise<unknown[]> => {}
export const fetchCinemas = async (): Promise<unknown[]> => {}
export const fetchShowtimes = async (): Promise<unknown[]> => {}
```

Keep chain-specific interfaces in `types.ts` and network or parsing logic in `scrape.ts`. The orchestrator in `src/scrape.ts` writes:

```text
data/raw/<chain>.json
```

with this shape:

```json
{
  "movies": [],
  "cinemas": [],
  "showtimes": []
}
```

Return arrays even when the upstream source is empty. Use stable raw IDs that the transform layer can prefix and reference consistently.

## Source Strategy

Prefer source strategies in this order:

1. Structured JSON or documented API endpoints.
2. Server-rendered HTML fetched with normal HTTP requests.
3. Playwright only when cookies, client-side rendering, CSRF state, or browser-only behavior is required.

For Playwright chains, keep browser use narrow, close pages and contexts reliably, and avoid introducing parallel browser runs. `src/scrape.ts` intentionally processes chains sequentially with a delay to reduce browser conflicts.

## Chain Patterns

Use these current examples as references:

- `gv`: public REST API with date iteration and de-duplication.
- `shaw`: internal endpoints requiring specific headers.
- `carnival`: REST API with generated HMAC token.
- `eaglewing`: Playwright for cookies and page state, then API calls.
- `filmhouse`: Playwright plus HTML parsing.
- `sfs`: Playwright and Peatix event follow-through.
- `oldham`, `alliancefrancaise`, `capitol`: newer indie venue patterns.

Do not copy DeepWiki references to `src/scrapers/`; the current repository uses `src/scripts/scrape/`.

## Validation

For scraper-only changes, use the narrowest useful checks first:

```bash
npx tsc --noEmit
npm run lint
npm run scrape <chain>
```

If the raw output changed, inspect `data/raw/<chain>.json` for nonzero counts, stable IDs, and fields needed by the transform. For new chains, also update CI with `$cinema-pipeline-ci` so the chain can be tested in pull requests.
