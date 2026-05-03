import { Browser } from 'playwright'
import { createPlaywrightSession, closePlaywrightSession } from '../../../utils/playwright-config'
import { FilmhouseMovie, FilmhouseSession } from './types'

const FILMHOUSE_SITE = 'https://filmhouse.sg'

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

const parseDateTime = (dateStr: string, timeStr: string): string => {
  // dateStr: "Sunday 3rd May" — extract day number and month name
  const dateMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)\s+(\w+)/)
  if (!dateMatch) return ''

  const day = dateMatch[1].padStart(2, '0')
  const monthName = dateMatch[2].slice(0, 3)
  const month = MONTH_MAP[monthName]
  if (!month) return ''

  const now = new Date()
  let year = now.getFullYear()
  // Advance year if the listed month is more than 2 months in the past
  if (parseInt(month) < now.getMonth() - 1) year++

  // timeStr: "1:30 pm" or "8:30 pm"
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!timeMatch) return ''

  let hours = parseInt(timeMatch[1], 10)
  const minutes = timeMatch[2]
  const period = timeMatch[3].toLowerCase()

  if (period === 'pm' && hours !== 12) hours += 12
  if (period === 'am' && hours === 12) hours = 0

  return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${minutes}:00+08:00`
}

interface RawFilmData {
  id: string
  slug: string
  title: string
  duration: number
  rating: string
  genre: string
  language: string
  posterUrl: string
  sessions: Array<{
    sessionId: string
    date: string
    time: string
    format: string
    bookUrl: string
  }>
}

/**
 * Navigates to Filmhouse films page and extracts all films and sessions
 * from the server-side rendered Jacro TaPoS HTML.
 */
export const fetchFilmsAndSessions = async (): Promise<{
  movies: FilmhouseMovie[]
  sessions: FilmhouseSession[]
}> => {
  let browser: Browser | null = null
  try {
    const { browser: b, page } = await createPlaywrightSession()
    browser = b

    await page.goto(`${FILMHOUSE_SITE}/films/`)
    await page.waitForTimeout(3000)

    const rawFilms = await page.evaluate<RawFilmData[]>(() => {
      var films: any[] = []
      document.querySelectorAll('.jacro-event.movie-tabs').forEach(function(el) {
        var filmLink = el.querySelector('a[href*="/film/"]')
        var href = filmLink ? (filmLink as HTMLAnchorElement).href : ''
        var urlMatch = href.match(/\/film\/(\d+)\/([^/]+)/)
        var id = urlMatch ? urlMatch[1] : ''
        var slug = urlMatch ? urlMatch[2] : ''

        var title = (el.querySelector('.liveeventtitle') || { textContent: '' }).textContent || ''
        title = title.trim()

        var spans = el.querySelectorAll('.running-time span')
        var duration = 0, rating = '', genre = ''
        spans.forEach(function(s) {
          var t = s.textContent ? s.textContent.trim() : ''
          var m = t.match(/(\d+)mins/)
          if (m) duration = parseInt(m[1])
          else if (t.startsWith('(')) rating = t.replace(/[()]/g, '').trim()
          else if (!/^\d{4}$/.test(t)) genre = t
        })

        var posterImg = el.querySelector('.film_img img')
        var posterUrl = posterImg ? ((posterImg as HTMLImageElement).src || '') : ''

        var language = ''
        el.querySelectorAll('em strong, strong em, em').forEach(function(e) {
          if (!language && e.textContent && e.textContent.includes('In ')) {
            language = e.textContent.replace('In ', '').trim()
          }
        })

        var sessions: any[] = []
        var list = el.querySelector('ul.performance-list-items')
        if (list) {
          var currentDate = ''
          list.childNodes.forEach(function(node) {
            if (node.nodeType !== 1) return
            var el = node as Element
            if (el.classList && el.classList.contains('heading')) {
              currentDate = el.textContent ? el.textContent.trim() : ''
            } else if (el.tagName === 'LI') {
              var a = el.querySelector('a.film_book_button')
              if (!a) return
              var bookUrl = (a as HTMLAnchorElement).href || ''
              var sessionIdMatch = bookUrl.match(/\/booknow\/(\d+)/)
              var sessionId = sessionIdMatch ? sessionIdMatch[1] : ''
              var timeSpan = a.querySelector('span.time')
              var time = timeSpan && timeSpan.textContent ? timeSpan.textContent.trim() : ''
              var tagEl = el.querySelector('.movietag span.tag')
              var format = tagEl && tagEl.textContent ? tagEl.textContent.trim() : '2D'
              sessions.push({ sessionId: sessionId, date: currentDate, time: time, format: format, bookUrl: bookUrl })
            }
          })
        }

        films.push({ id: id, slug: slug, title: title, duration: duration, rating: rating, genre: genre, language: language, posterUrl: posterUrl, sessions: sessions })
      })
      return films
    })

    const movies: FilmhouseMovie[] = []
    const sessions: FilmhouseSession[] = []

    for (const film of rawFilms) {
      if (!film.id) continue

      movies.push({
        id: film.id,
        title: film.title || film.slug.replace(/-/g, ' '),
        rating: film.rating,
        language: film.language,
        genre: film.genre,
        duration: film.duration,
        synopsis: '',
        posterUrl: film.posterUrl,
        trailerUrl: '',
        openingDate: '',
      })

      for (const s of film.sessions) {
        if (!s.sessionId || !s.date || !s.time) continue
        const startTime = parseDateTime(s.date, s.time)
        if (!startTime) continue

        sessions.push({
          id: s.sessionId,
          filmId: film.id,
          screenId: '',
          screenName: '',
          startTime,
          attributes: s.format && s.format !== '2D' ? [s.format] : [],
          bookingUrl: s.bookUrl || `${FILMHOUSE_SITE}/films/`,
        })
      }
    }

    return { movies, sessions }
  } finally {
    if (browser) await closePlaywrightSession(browser)
  }
}
