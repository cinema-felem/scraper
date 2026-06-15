[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cinema-felem/scraper)

[https://deepwiki.com/cinema-felem/scraper/](https://deepwiki.com/cinema-felem/scraper/)

Install Python runtime dependencies before running live DB storage:

```sh
npm run python:install
```

1. Scrape (`python3 -m pyetl scrape` / `npm run scrape`)
   Scrape from websites
   Store on data/raw

2. Transform (`python3 -m pyetl transform` / `npm run transform`)
   Reads data/raw and transforms it to standardised format on data/intermediate
   Store on data/intermediate

3. Storage (`python3 -m pyetl storage` / `npm run storage`)
   Reads from data/intermediate, Store to DB
   Requires `DATABASE_URL`
   Use `npm run storage:dry-run` to validate the merge file without DB access

4. Metadata (metadata.js)
   Still TypeScript.
   Reads from data/intermediate, Store to DB
   Get metadata from TMDB/Google Maps
   Get rating from OMDB, Trakt and Letterboxd
   Store on data/metadata

   **OpenRouter Integration for Unmatched Movies:**
   When TMDB search returns no results for a movie title, the system automatically:
   1. Uses OpenRouter API to correct/normalize the title
   2. Retries TMDB search with corrected title
   3. If still no results, extracts core title from complex strings
   4. Retries TMDB search with extracted title

   Free models used (with automatic fallback):
   - deepseek/deepseek-chat-v3-0324:free
   - qwen/qwen3-235b-a22b:free
   - google/gemini-2.0-flash-exp:free
   - meta-llama/llama-3.3-70b-instruct:free
   - openai/gpt-oss-20b:free
   - mistralai/mistral-small-3.2-24b-instruct:free

   This improves match rates for:
   - Titles with typos or misspellings
   - Abbreviated titles
   - Titles with extra metadata (IMAX, 3D, year, etc.)
   - Foreign language titles with mixed scripts
