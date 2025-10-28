[https://deepwiki.com/cinema-felem/scraper/](https://deepwiki.com/cinema-felem/scraper/)

1. Scrape (scrape.js)
   Scrape from websites
   Store on data/raw

2. Transform (transform.js)
   Reads data/raw and transforms it to standardised format on data/intermediate
   Generates data/permutations for debugging
   Store on data/intermediate, data/permutations

3. Storage (storage.js)
   Reads from data/intermediate, Store to DB
   Does minor pattern matching to reconcile differing cinema namings
   Lookup from 'updates' to keep existing data in sync

4. Metadata (metadata.js)
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
