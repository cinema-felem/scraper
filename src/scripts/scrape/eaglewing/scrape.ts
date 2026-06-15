import { EagleWingMovie, EagleWingSession, EagleWingShowtime } from './types'

const BASE_URL = 'https://www.eaglewingscinematics.com.sg'

const buildHeaders = (
  csrfToken: string,
  xsrfToken: string,
  cookieString: string,
  referer = `${BASE_URL}/movies`,
): Record<string, string> => ({
  accept: 'application/json',
  'content-type': 'application/json',
  'x-csrf-token': csrfToken,
  'x-xsrf-token': xsrfToken,
  'x-requested-with': 'XMLHttpRequest',
  cookie: cookieString,
  Referer: referer,
})

interface RawFilmListing {
  link: string
  image: string
  title: string
  rating: string
  openingdate: string
  description: string
}

export const extractCsrfToken = (html: string): string =>
  html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ?? ''

export const extractEagleWingMovieVars = (
  html: string,
): { cinemaId: string; scheduledFilmId: string } => ({
  cinemaId: html.match(/CinemaId\s*:\s*"([^"]+)"/)?.[1] ?? '0000000001',
  scheduledFilmId: html.match(/ScheduledFilmId\s*:\s*"([^"]+)"/)?.[1] ?? '',
})

const getSetCookies = (headers: Headers): string[] => {
  const headersWithCookies = headers as Headers & { getSetCookie?: () => string[] }
  if (headersWithCookies.getSetCookie) return headersWithCookies.getSetCookie()
  const cookieHeader = headers.get('set-cookie')
  if (!cookieHeader) return []
  return cookieHeader.split(/,(?=\s*[^;,]+=)/)
}

const getSession = async (): Promise<{
  csrfToken: string
  xsrfToken: string
  cookieString: string
}> => {
  const response = await fetch(`${BASE_URL}/movies`)
  if (!response.ok) throw new Error(`EagleWings movies page returned ${response.status}`)

  const html = await response.text()
  const csrfToken = extractCsrfToken(html)
  const cookieString = getSetCookies(response.headers)
    .map(cookie => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ')
  const xsrfToken = decodeURIComponent(
    cookieString.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
  )

  if (!csrfToken) throw new Error('EagleWings: could not read CSRF token from /movies')

  return { csrfToken, xsrfToken, cookieString }
}

/**
 * Scrapes all EagleWings movies and showtimes through server-rendered HTML and JSON APIs.
 *
 * Flow:
 *  1. Fetch /movies, extract CSRF token (meta tag) + XSRF token (cookie)
 *  2. GET /api/v1/film/showings for the movie list
 *  3. For each movie, fetch its detail page to read window.Vars.ScheduledFilmId
 *  4. POST /api/v1/film/time-scheduled to get all sessions for that film
 */
export const scrapeMoviesAndShowtimes = async (): Promise<{
  movies: EagleWingMovie[]
  showtimes: EagleWingShowtime[]
}> => {
  const { csrfToken, xsrfToken, cookieString } = await getSession()

  const moviesRes = await fetch(`${BASE_URL}/api/v1/film/showings`, {
    headers: buildHeaders(csrfToken, xsrfToken, cookieString),
    method: 'GET',
  })
  if (!moviesRes.ok) throw new Error(`EagleWings showings API returned ${moviesRes.status}`)
  const rawFilms: RawFilmListing[] = await moviesRes.json()

  const movies: EagleWingMovie[] = []
  const showtimes: EagleWingShowtime[] = []

  for (const film of rawFilms) {
    const urlMatch = film.link?.match(/\/movie\/([^/]+)\/([^/]+)$/)
    if (!urlMatch) continue

    const slug = urlMatch[1]
    const filmCode = urlMatch[2]
    const detailUrl = `${BASE_URL}/movie/${slug}/${filmCode}`

    try {
      const detailRes = await fetch(detailUrl, { headers: { cookie: cookieString } })
      if (!detailRes.ok) continue

      const detailHtml = await detailRes.text()
      const { cinemaId, scheduledFilmId } = extractEagleWingMovieVars(detailHtml)
      if (!scheduledFilmId) continue

      const movieId = Number(scheduledFilmId)

      movies.push({
        id: movieId,
        slug,
        title: film.title || slug.replace(/-/g, ' '),
        rating: film.rating || '',
        language: '',
        genre: '',
        duration: 0,
        synopsis: film.description || '',
        posterUrl: film.image || '',
        openingDate: film.openingdate || '',
      })

      const sessionsRes = await fetch(`${BASE_URL}/api/v1/film/time-scheduled`, {
        method: 'POST',
        headers: buildHeaders(csrfToken, xsrfToken, cookieString, detailUrl),
        body: JSON.stringify({
          movie: { Title: film.title, Rating: film.rating },
          cinema_id: cinemaId,
          scheduledfilm_id: scheduledFilmId,
        }),
      })

      if (!sessionsRes.ok) continue

      const sessionsData = await sessionsRes.json()
      const filmGroups: any[] = sessionsData?.films ?? []
      const sessionsByDate = new Map<string, EagleWingSession[]>()

      for (const group of filmGroups) {
        const hall: string = group?.ScreenName ?? ''
        const times = group?.times ?? {}

        for (const daySessions of Object.values(times)) {
          for (const s of daySessions as any[]) {
            const screen = s?.screen ?? {}
            const raw: string = screen?.raw ?? ''
            if (!raw) continue

            const date = raw.split('T')[0]
            const time: string = screen?.time ?? s?.time ?? ''
            const timeId: string = String(screen?.stamp ?? s?.id ?? `${movieId}-${raw}`)
            const bookingUrl: string = s?.link ?? `${BASE_URL}/movies`

            const session: EagleWingSession = {
              id: timeId,
              date,
              time,
              hall,
              format: '2D',
              bookingUrl,
            }

            if (!sessionsByDate.has(date)) sessionsByDate.set(date, [])
            sessionsByDate.get(date)!.push(session)
          }
        }
      }

      for (const [date, sessions] of sessionsByDate) {
        if (sessions.length > 0) {
          showtimes.push({ movieId, movieSlug: slug, date, sessions })
        }
      }
    } catch (err) {
      console.error(`EagleWings: error processing ${slug}:`, err)
    }
  }

  return { movies, showtimes }
}
