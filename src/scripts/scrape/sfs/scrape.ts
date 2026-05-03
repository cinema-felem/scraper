import { Browser } from 'playwright'
import { createPlaywrightSession, closePlaywrightSession } from '../../../utils/playwright-config'
import { SFSMovie, SFSShowtime } from './types'

const SFS_SITE = 'https://sfs-somerset.com'

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

/**
 * Parses "29 Apr" + "7.30pm" into ISO datetime string in SGT (+08:00).
 * Uses the current year (or next if the month is past by > 2 months).
 */
const parseDateTime = (day: string, monthStr: string, timeStr: string): { date: string; time: string } => {
  const month = MONTH_MAP[monthStr.toLowerCase().slice(0, 3)]
  if (!month) return { date: '', time: '' }

  const now = new Date()
  let year = now.getFullYear()
  if (parseInt(month) < now.getMonth() - 1) year++

  const date = `${year}-${month}-${day.padStart(2, '0')}`

  // Normalise "7.30pm" or "7:30pm" or "7:30 pm"
  const timeMatch = timeStr.replace('.', ':').match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (!timeMatch) return { date, time: '' }

  let hours = parseInt(timeMatch[1], 10)
  const mins = timeMatch[2]
  const period = timeMatch[3].toLowerCase()

  if (period === 'pm' && hours !== 12) hours += 12
  if (period === 'am' && hours === 12) hours = 0

  return { date, time: `${hours % 12 || 12}:${mins} ${period.toUpperCase()}` }
}

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

interface RawFilmSection {
  title: string
  durationMins: number
  language: string
  rating: string
  synopsis: string
  posterUrl: string
}

/**
 * Scrapes the SFS homepage for film metadata and Peatix event links,
 * then visits each Peatix event page for individual session times.
 */
export const scrapeShowtimes = async (): Promise<{
  movies: SFSMovie[]
  showtimes: SFSShowtime[]
}> => {
  let browser: Browser | null = null
  try {
    const { browser: b, page } = await createPlaywrightSession()
    browser = b

    await page.goto(SFS_SITE)
    await page.waitForTimeout(3000)

    // Extract film sections from homepage
    const rawFilms = await page.evaluate<RawFilmSection[]>(() => {
      var films: any[] = []
      document.querySelectorAll('section').forEach(function(section) {
        var h2 = section.querySelector('h2')
        if (!h2) return
        var title = h2.textContent ? h2.textContent.trim() : ''
        if (!title || title.toLowerCase().includes('book') || title.toLowerCase().includes('welcome') || title.toLowerCase().includes('upcoming') || title.toLowerCase().includes('featured') || title.toLowerCase().includes('bring') || title.toLowerCase().includes('frequently') || title.toLowerCase().includes('if you')) return

        var h4s = section.querySelectorAll('h4')
        var durationMins = 0, language = '', rating = ''
        h4s.forEach(function(h) {
          var t = h.textContent ? h.textContent.trim() : ''
          var dm = t.match(/(\d+)\s*[Mm]inutes?/)
          if (dm) durationMins = parseInt(dm[1])
          if (t.includes('|')) {
            var parts = t.split('|').map(function(p) { return p.trim() })
            parts.forEach(function(p) {
              if (!rating && /^[A-Z][A-Z0-9]{0,3}(\s|$|\()/.test(p)) rating = p
              else if (!language && (p.includes('English') || p.includes('Mandarin') || p.includes('Malay') || p.includes('no subtitles'))) language = p
            })
          }
        })

        var paras = section.querySelectorAll('p')
        var synopsis = ''
        paras.forEach(function(p) {
          var t = p.textContent ? p.textContent.trim() : ''
          if (t.length > 50 && !synopsis) synopsis = t
        })

        var img = section.querySelector('img')
        var posterUrl = img ? (img as HTMLImageElement).src : ''

        films.push({ title: title, durationMins: durationMins, language: language, rating: rating, synopsis: synopsis, posterUrl: posterUrl })
      })
      return films
    })

    // Extract Peatix links from homepage
    const peatixLinks = await page.evaluate<string[]>(() => {
      var links: string[] = []
      document.querySelectorAll('a[href*="peatix.com"]').forEach(function(a) {
        var h = (a as HTMLAnchorElement).href
        if (h && !links.includes(h)) links.push(h)
      })
      return links
    })

    // Build movies map
    const moviesMap = new Map<string, SFSMovie>()
    for (const film of rawFilms) {
      const id = slugify(film.title)
      if (!id) continue
      // Use first Peatix link as placeholder; will be overwritten per-session
      moviesMap.set(id, {
        id,
        title: film.title,
        language: film.language,
        genre: '',
        duration: film.durationMins,
        synopsis: film.synopsis,
        posterUrl: film.posterUrl,
        peatixEventUrl: peatixLinks[0] || SFS_SITE,
      })
    }

    const showtimes: SFSShowtime[] = []

    // Visit each Peatix event page and extract session data
    for (const peatixUrl of peatixLinks) {
      try {
        await page.goto(peatixUrl)
        await page.waitForTimeout(3000)

        const sessions = await page.evaluate<Array<{ raw: string }>>(() => {
          var sessions: any[] = []
          var seen = new Set<string>()
          document.querySelectorAll('[class*="ticket"]').forEach(function(el) {
            var t = el.textContent ? el.textContent.trim().replace(/\s+/g, ' ') : ''
            // Match individual ticket lines: "Wed 29 Apr, 7.30pm (FILM TITLE) $15"
            var pattern = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs)\s+(\d{1,2})\s+(\w+),\s+([\d.:]+(?:am|pm))\s+\(([^)]+)\)/gi
            var match
            while ((match = pattern.exec(t)) !== null) {
              var key = match[0]
              if (!seen.has(key)) {
                seen.add(key)
                sessions.push({ raw: match[0], day: match[1], month: match[2], time: match[3], filmTitle: match[4] })
              }
            }
          })
          return sessions
        })

        for (const s of sessions as any[]) {
          const { date, time } = parseDateTime(s.day, s.month, s.time)
          if (!date || !time) continue

          const filmTitle = s.filmTitle as string
          const movieId = slugify(filmTitle)

          // Add movie if not already present (may not be in homepage film sections)
          if (!moviesMap.has(movieId)) {
            moviesMap.set(movieId, {
              id: movieId,
              title: filmTitle,
              language: '',
              genre: '',
              duration: 0,
              synopsis: '',
              posterUrl: '',
              peatixEventUrl: peatixUrl,
            })
          } else {
            // Update Peatix URL for this movie
            const m = moviesMap.get(movieId)!
            m.peatixEventUrl = peatixUrl
          }

          showtimes.push({
            movieId,
            movieTitle: filmTitle,
            date,
            time,
            endTime: '',
            peatixUrl,
          })
        }
      } catch (err) {
        console.error(`SFS: error scraping Peatix page ${peatixUrl}:`, err)
      }
    }

    return { movies: Array.from(moviesMap.values()), showtimes }
  } catch (err) {
    console.error('SFS: failed to scrape:', err)
    return { movies: [], showtimes: [] }
  } finally {
    if (browser) await closePlaywrightSession(browser)
  }
}
