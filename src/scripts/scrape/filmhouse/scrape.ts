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

const decodeHtml = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')

const stripTags = (value: string): string =>
  decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())

const getAttr = (html: string, name: string): string =>
  html.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] ?? ''

const splitFilmBlocks = (html: string): string[] => {
  const marker = '<div class="jacro-event movie-tabs row"'
  const blocks: string[] = []
  let start = html.indexOf(marker)
  while (start >= 0) {
    const next = html.indexOf(marker, start + marker.length)
    blocks.push(html.slice(start, next >= 0 ? next : html.length))
    start = next
  }
  return blocks
}

export const parseFilmhouseFilms = (html: string): RawFilmData[] =>
  splitFilmBlocks(html).map(block => {
    const titleAnchor = block.match(/<a[^>]*class=["']liveeventtitle["'][^>]*>([\s\S]*?)<\/a>/i)
    const title = stripTags(titleAnchor?.[1] ?? '')
    const href = titleAnchor ? getAttr(titleAnchor[0], 'href') : ''
    const urlMatch = href.match(/\/film\/(\d+)\/([^/"']+)/)
    const id = urlMatch ? urlMatch[1] : ''
    const slug = urlMatch ? urlMatch[2] : ''

    const imageBlock = block.match(/<div class=["']film_img["'][\s\S]*?<\/div>/i)?.[0] ?? ''
    const posterUrl = getAttr(imageBlock.match(/<img[^>]+>/i)?.[0] ?? '', 'src')

    const runningTime = block.match(/<div class=["']running-time["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''
    const spans = Array.from(runningTime.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)).map(match => stripTags(match[1]))
    let duration = 0
    let rating = ''
    let genre = ''
    for (const span of spans) {
      const durationMatch = span.match(/(\d+)mins/i)
      if (durationMatch) duration = parseInt(durationMatch[1], 10)
      else if (span.startsWith('(')) rating = span.replace(/[()]/g, '').trim()
      else if (!/^\d{4}$/.test(span)) genre = span
    }

    const language = stripTags(block.match(/In\s+([^.<]+)/i)?.[1] ?? '')
    const sessions: RawFilmData['sessions'] = []
    const performanceHtml = block.match(/<ul class=["']performance-list-items["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? ''
    const tokenPattern = /<div class=["']heading["'][^>]*>([\s\S]*?)<\/div>|<li[^>]*>([\s\S]*?)<\/li>/gi
    let currentDate = ''
    let token: RegExpExecArray | null
    while ((token = tokenPattern.exec(performanceHtml)) !== null) {
      if (token[1]) {
        currentDate = stripTags(token[1])
        continue
      }

      const li = token[2] ?? ''
      const anchor = li.match(/<a[^>]*class=["'][^"']*film_book_button[^"']*["'][^>]*>[\s\S]*?<\/a>/i)?.[0] ?? ''
      if (!anchor) continue
      const bookUrl = getAttr(anchor, 'href')
      const sessionId = bookUrl.match(/\/booknow\/(\d+)/)?.[1] ?? ''
      const time = stripTags(anchor.match(/<span[^>]*class=["']time["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '')
      const format = stripTags(li.match(/<span[^>]*class=["']tag["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '') || '2D'
      sessions.push({ sessionId, date: currentDate, time, format, bookUrl })
    }

    return { id, slug, title, duration, rating, genre, language, posterUrl, sessions }
  })

/**
 * Navigates to Filmhouse films page and extracts all films and sessions
 * from the server-side rendered Jacro TaPoS HTML.
 */
export const fetchFilmsAndSessions = async (): Promise<{
  movies: FilmhouseMovie[]
  sessions: FilmhouseSession[]
}> => {
  const response = await fetch(`${FILMHOUSE_SITE}/films/`)
  if (!response.ok) throw new Error(`Filmhouse films page returned ${response.status}`)
  const rawFilms = parseFilmhouseFilms(await response.text())

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
}
