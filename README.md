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
