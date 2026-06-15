---
name: cinema-transform-normalizer
description: Create, fix, or review cinema transform normalization in the cinema-felem scraper repository. Use when working on chain transforms under src/scripts/transform, BaseTransformer, transform factories, raw-to-standard mapping, StandardMovie, StandardCinema, StandardShowtime, transform fixtures or tests, data/intermediate output, showtime foreign-key consistency, title cleaning, format parsing, or timestamp normalization.
---

# Cinema Transform Normalizer

## Workflow

Transforms convert `data/raw/<chain>.json` into standard records in `data/intermediate/<chain>.json` and merged output in `data/intermediate/merge.json`.

1. Inspect the raw scraper output and the chain-specific raw types.
2. Choose the simplest local pattern that fits: `BaseTransformer` plus factories for straightforward maps, or a custom transform for complex parent-child relationships.
3. Preserve ID consistency across movies, cinemas, and showtimes.
4. Add or update transform tests with fixtures when behavior changes.
5. Run type, lint, test, and focused transform validation, or use `$cinema-data-pipeline` when validating stage handoffs.

## Standard Contract

Every transform exports:

```ts
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
```

or an equivalent exported function used by `src/transform.ts`.

Return:

```ts
{
  movies: StandardMovie[]
  cinemas: StandardCinema[]
  showtimes: StandardShowtime[]
}
```

Required invariants:

- Every `id` is prefixed with `<chain>:`.
- Every `StandardShowtime.filmId` matches a `StandardMovie.id` from the same transform result.
- Every `StandardShowtime.cinemaId` matches a `StandardCinema.id` from the same transform result.
- `unixTime` is a positive millisecond timestamp.
- `source.chain` and `source.id` preserve the upstream origin.
- `source.details` keeps useful raw context for debugging without depending on unstable whole-page blobs.

## Mapping Guidance

Use `makeTransformMovies` and `makeTransformCinemas` from `src/scripts/transform/factory.ts` when the raw records map field-by-field.

Use custom mapping when the transform must:

- Collapse multiple movie formats to a parent movie.
- Flatten nested showtime structures.
- Resolve showtime references through parent records.
- Parse venue-specific time formats.
- Skip invalid records with explicit logging.

Use helpers from `src/text` for string cleanup and `src/utils/time.ts` for Singapore time parsing when available. Avoid ad hoc date parsing when an existing helper fits.

## Fixtures And Tests

Store transform fixtures under:

```text
src/scripts/transform/__tests__/fixtures/<chain>.json
```

Tests should at minimum assert:

- Movie IDs are chain-prefixed.
- Cinema IDs are chain-prefixed.
- Showtimes have positive `unixTime`.
- Showtime `filmId` values reference output movies.
- Showtime `cinemaId` values reference output cinemas.

Run focused tests with:

```bash
npx mocha --require ts-node/register 'src/scripts/transform/__tests__/<chain>.test.ts'
```

Then run:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run transform <chain>
```

If transforming all chains, inspect `data/intermediate/merge.json` for unexpectedly dropped movies after the cleanup step.
