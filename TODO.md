# Scrapers TODO

## Remaining indie/cultural venues

### Objectifs (155 Middle Road)

**Status:** Deferred — sporadic schedule, WordPress site has a critical error on the screenings category page.

**When to tackle:** Once the WordPress error is resolved and they have an active screening programme.

**Approach when ready:**
- URL: `https://www.objectifs.com.sg/category/whats-on/screenings/`
- WordPress blog posts listing screenings (no structured API)
- Ticketing via Eventbrite or Peatix (mixed per event)
- Date/time embedded in post body text — needs regex extraction
- Same Peatix follow-through pattern as SFS

---

### ArtScience Cinema (Marina Bay Sands)

**Status:** Not viable — individual showtimes are only published in PDF schedule files, not in page HTML.

**Blocker:** `marinabaysands.com/museum/experiences/cinema.html` shows date ranges per programme (e.g. "16 Feb – 3 May 2026"), but the actual session times are in a weekly PDF (e.g. `2026-apr-wk-3-4-cinema-schedule.pdf`). No structured data endpoint exists.

**Approach if revisited:**
- Download the weekly PDF schedules programmatically
- Parse PDF text for session times using a PDF-to-text library
- Check: `https://www.marinabaysands.com/museum/experiences/cinema.html` for PDF links
- Ticket booking via MBS museum system (`/museum/ticket/search.html`)

---

### The Arts House Screening Room (1 Old Parliament Lane)

**Status:** Deferred — highly fragmented, not reliable enough to scrape.

**Blockers:**
1. Events calendar is JavaScript-rendered (Drupal CMS), requires Playwright
2. No consistent ticketing platform — some events use Fever, others direct venue booking, others are free
3. The Screening Room hosts many types of events beyond film screenings; filtering is unreliable

**Approach if revisited:**
- URL: `https://www.theartshouse.sg/whats-on/`
- Filter events by venue "Screening Room" in the JS calendar
- Intercept the network request the JS calendar makes for event data
- For each event, visit the page and detect if it's a film screening (vs talk, concert, etc.)
- Follow ticketing link (Fever, direct, or free) per event
