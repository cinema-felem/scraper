import assert from 'assert'
import {
  extractCsrfToken,
  extractEagleWingMovieVars,
} from './scrape'

describe('eaglewing scraper parsing', () => {
  it('extracts csrf token and movie variables from server-rendered html', () => {
    const html = `
      <meta name="csrf-token" content="token-123">
      <script>
        window.Vars = {
          Movie : { 'Title' : "Toy Story", 'Rating' : "PG" },
          CinemaId : "0000000001",
          ScheduledFilmId : "1000000658"
        };
      </script>
    `

    assert.strictEqual(extractCsrfToken(html), 'token-123')
    assert.deepStrictEqual(extractEagleWingMovieVars(html), {
      cinemaId: '0000000001',
      scheduledFilmId: '1000000658',
    })
  })
})
