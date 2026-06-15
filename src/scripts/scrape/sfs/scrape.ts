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

interface RawSfsSession {
  day: string
  month: string
  time: string
  filmTitle: string
}

const decodeHtml = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')

const collectPeatixLinks = (html: string): string[] => {
  const links = new Set<string>()
  for (const match of html.matchAll(/href=["'](https:\/\/[^"']*peatix\.com[^"']*)["']/gi)) {
    links.add(decodeHtml(match[1]))
  }
  return [...links]
}

export const parseSfsSessionLines = (html: string): RawSfsSession[] => {
  const sessions: RawSfsSession[] = []
  const seen = new Set<string>()
  const decoded = decodeHtml(html).replace(/\s+/g, ' ')
  const pattern = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs)\s+(\d{1,2})\s+([A-Za-z]+),?\s+([\d.:]+(?:am|pm))\s+\(([^)]+)\)/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(decoded)) !== null) {
    const key = match[0]
    if (seen.has(key)) continue
    seen.add(key)
    sessions.push({
      day: match[1],
      month: match[2],
      time: match[3],
      filmTitle: match[4].trim(),
    })
  }

  return sessions
}

/**
 * Scrapes the SFS homepage for film metadata and Peatix event links,
 * then visits each Peatix event page for individual session times.
 */
export const scrapeShowtimes = async (): Promise<{
  movies: SFSMovie[]
  showtimes: SFSShowtime[]
}> => {
  const homeRes = await fetch(SFS_SITE)
  if (!homeRes.ok) throw new Error(`SFS homepage returned ${homeRes.status}`)
  const peatixLinks = collectPeatixLinks(await homeRes.text())

  const moviesMap = new Map<string, SFSMovie>()
  const showtimes: SFSShowtime[] = []

  for (const peatixUrl of peatixLinks) {
    try {
      const peatixRes = await fetch(peatixUrl)
      if (!peatixRes.ok) continue

      for (const session of parseSfsSessionLines(await peatixRes.text())) {
        const { date, time } = parseDateTime(session.day, session.month, session.time)
        if (!date || !time) continue

        const filmTitle = session.filmTitle
        const movieId = slugify(filmTitle)

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
          const movie = moviesMap.get(movieId)!
          movie.peatixEventUrl = peatixUrl
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
}
