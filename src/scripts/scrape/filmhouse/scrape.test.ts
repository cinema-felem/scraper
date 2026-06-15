import assert from 'assert'
import { parseFilmhouseFilms } from './scrape'

describe('filmhouse scraper parsing', () => {
  it('extracts films and sessions from Jacro film markup', () => {
    const html = `
      <div class="jacro-event movie-tabs row">
        <a href="http://filmhouse.sg/film/109/the-voice-of-hind-rajab">
          <img src="https://example.com/poster.jpg">
        </a>
        <a class="liveeventtitle" href="http://filmhouse.sg/film/109/the-voice-of-hind-rajab">The Voice of Hind Rajab</a>
        <div class="running-time"><span>2025</span><span>89mins</span><span>(R21)</span><span>Thriller/Suspense</span></div>
        <p><em><strong>In Arabic with English Subtitles.</strong></em></p>
        <ul class="performance-list-items">
          <div class="heading">Sunday 14th June</div>
          <li><a href="https://filmhouse.sg/filmhouse-singapore/booknow/1091" class="film_book_button"><span class="time">8:30 pm</span></a></li>
        </ul>
      </div>
    `

    const parsed = parseFilmhouseFilms(html)

    assert.strictEqual(parsed[0].id, '109')
    assert.strictEqual(parsed[0].title, 'The Voice of Hind Rajab')
    assert.strictEqual(parsed[0].sessions[0].sessionId, '1091')
    assert.strictEqual(parsed[0].sessions[0].date, 'Sunday 14th June')
    assert.strictEqual(parsed[0].sessions[0].time, '8:30 pm')
  })
})
