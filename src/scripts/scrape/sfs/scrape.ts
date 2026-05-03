import { By, WebDriver, until } from 'selenium-webdriver'
import { createChromeDriver, safeQuitDriver } from '../../../utils/selenium-config'
import { SFSMovie, SFSShowtime } from './types'

const SFS_SITE = 'https://www.sfs-somerset.com'

/**
 * Scrapes upcoming screenings from the SFS Somerset website.
 * SFS uses Peatix for ticketing, so we parse the screening listings
 * from the SFS site and follow Peatix links for event details.
 */
export const scrapeShowtimes = async (): Promise<{
  movies: SFSMovie[]
  showtimes: SFSShowtime[]
}> => {
  let driver: WebDriver | null = null
  try {
    driver = await createChromeDriver()
    const d = driver
    await d.get(`${SFS_SITE}/screenings`)

    await d.wait(
      until.elementLocated(By.css('article, .screening, .event, .movie, main')),
      15000,
    )

    const pageSource = await d.getPageSource()
    return parseScreeningsPage(pageSource)
  } catch (err) {
    console.error('SFS: failed to scrape screenings page:', err)
    return { movies: [], showtimes: [] }
  } finally {
    if (driver) await safeQuitDriver(driver)
  }
}

const parseScreeningsPage = (
  html: string,
): { movies: SFSMovie[]; showtimes: SFSShowtime[] } => {
  // Extract structured JSON-LD data if present
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1])
      const events = Array.isArray(parsed) ? parsed : [parsed]
      const screeningEvents = events.filter(
        (e: any) => e['@type'] === 'ScreeningEvent' || e['@type'] === 'Event',
      )
      if (screeningEvents.length > 0) {
        return buildFromJsonLd(screeningEvents)
      }
    } catch {
      // continue to HTML parsing
    }
  }

  return parseFromHtml(html)
}

const buildFromJsonLd = (
  events: any[],
): { movies: SFSMovie[]; showtimes: SFSShowtime[] } => {
  const moviesMap = new Map<string, SFSMovie>()
  const showtimes: SFSShowtime[] = []

  events.forEach((event, idx) => {
    const title: string = event?.name ?? event?.workPresented?.name ?? `Film ${idx + 1}`
    const movieId = slugify(title)
    const startDate: string = event?.startDate ?? ''
    const endDate: string = event?.endDate ?? ''
    const peatixUrl: string =
      event?.url ?? event?.offers?.url ?? `${SFS_SITE}/screenings`

    if (!moviesMap.has(movieId)) {
      moviesMap.set(movieId, {
        id: movieId,
        title,
        language: event?.inLanguage ?? '',
        genre: event?.genre ?? '',
        duration: parseDuration(event?.duration ?? ''),
        synopsis: event?.description ?? '',
        posterUrl: event?.image ?? event?.thumbnail ?? '',
        peatixEventUrl: peatixUrl,
      })
    }

    if (startDate) {
      const { date, time } = splitDateTime(startDate)
      const { time: endTime } = splitDateTime(endDate)
      showtimes.push({ movieId, movieTitle: title, date, time, endTime, peatixUrl })
    }
  })

  return { movies: Array.from(moviesMap.values()), showtimes }
}

const parseFromHtml = (
  html: string,
): { movies: SFSMovie[]; showtimes: SFSShowtime[] } => {
  const moviesMap = new Map<string, SFSMovie>()
  const showtimes: SFSShowtime[] = []

  // Extract Peatix event links and titles from anchors
  const peatixPattern = /href="(https:\/\/[^"]*peatix\.com\/event\/[^"]+)"[^>]*>([^<]+)</gi
  for (const match of html.matchAll(peatixPattern)) {
    const [, url, rawTitle] = match
    const title = rawTitle.trim()
    if (!title) continue
    const movieId = slugify(title)

    if (!moviesMap.has(movieId)) {
      moviesMap.set(movieId, {
        id: movieId,
        title,
        language: '',
        genre: '',
        duration: 0,
        synopsis: '',
        posterUrl: '',
        peatixEventUrl: url,
      })
    }
  }

  // Extract date/time patterns near screening titles
  // e.g. "12 Jan 2025", "7:30pm", "19:30"
  const datePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*[,\-–]?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/gi
  const dateMatches = [...html.matchAll(datePattern)]

  dateMatches.forEach((match, idx) => {
    const [, rawDate, rawTime] = match
    const movieList = Array.from(moviesMap.values())
    if (movieList.length === 0) return
    const movie = movieList[idx % movieList.length]
    const date = parseTextDate(rawDate)
    if (!date) return
    showtimes.push({
      movieId: movie.id,
      movieTitle: movie.title,
      date,
      time: rawTime.trim(),
      endTime: '',
      peatixUrl: movie.peatixEventUrl,
    })
  })

  return { movies: Array.from(moviesMap.values()), showtimes }
}

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const parseDuration = (iso: string): number => {
  if (!iso) return 0
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return 0
  return (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60 * 1000
}

const splitDateTime = (iso: string): { date: string; time: string } => {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { date: '', time: '' }
  const sgOffset = 8 * 60
  const local = new Date(d.getTime() + sgOffset * 60 * 1000)
  const date = local.toISOString().split('T')[0]
  const hours = local.getUTCHours()
  const mins = local.getUTCMinutes()
  const period = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  const time = `${h12}:${String(mins).padStart(2, '0')} ${period}`
  return { date, time }
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

const parseTextDate = (text: string): string | null => {
  const m = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) return null
  const day = m[1].padStart(2, '0')
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)]
  if (!month) return null
  return `${m[3]}-${month}-${day}`
}
