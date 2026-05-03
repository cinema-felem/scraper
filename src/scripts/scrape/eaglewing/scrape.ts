import { WebDriver } from 'selenium-webdriver'
import { createChromeDriver, safeQuitDriver } from '../../../utils/selenium-config'
import { EagleWingMovie, EagleWingSession, EagleWingShowtime } from './types'

const BASE_URL = 'https://www.eaglewingscinematics.com.sg'

const buildHeaders = (csrfToken: string, xsrfToken: string, cookieString: string): Record<string, string> => ({
  accept: 'application/json',
  'content-type': 'application/json',
  'x-csrf-token': csrfToken,
  'x-xsrf-token': xsrfToken,
  'x-requested-with': 'XMLHttpRequest',
  cookie: cookieString,
  Referer: `${BASE_URL}/movies`,
})

interface RawFilmListing {
  link: string
  image: string
  title: string
  rating: string
  openingdate: string
  description: string
}

/**
 * Scrapes all EagleWings movies and showtimes in a single Selenium session.
 *
 * Flow:
 *  1. Navigate to /movies, extract CSRF token (meta tag) + XSRF token (cookie)
 *  2. GET /api/v1/film/showings for the movie list
 *  3. For each movie, navigate to its detail page to read window.Vars.ScheduledFilmId
 *  4. POST /api/v1/film/time-scheduled to get all sessions for that film
 */
export const scrapeMoviesAndShowtimes = async (): Promise<{
  movies: EagleWingMovie[]
  showtimes: EagleWingShowtime[]
}> => {
  let driver: WebDriver | null = null
  try {
    driver = await createChromeDriver()
    const d = driver

    // Step 1: get CSRF and XSRF tokens
    await d.get(`${BASE_URL}/movies`)
    await d.sleep(3000)

    const csrfToken = await d.executeScript<string>(
      `return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''`,
    )
    const cookies = await d.manage().getCookies()
    const xsrfCookie = cookies.find((c: any) => c.name === 'XSRF-TOKEN')
    const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : ''
    // Build cookie header string to include laravel_session and XSRF-TOKEN for Node fetch
    const cookieString = cookies
      .map((c: any) => `${c.name}=${c.value}`)
      .join('; ')

    if (!csrfToken) throw new Error('EagleWings: could not read CSRF token from meta tag')

    // Step 2: fetch movies list
    const moviesRes = await fetch(`${BASE_URL}/api/v1/film/showings`, {
      headers: buildHeaders(csrfToken, xsrfToken, cookieString),
      method: 'GET',
    })
    if (!moviesRes.ok) throw new Error(`EagleWings showings API returned ${moviesRes.status}`)
    const rawFilms: RawFilmListing[] = await moviesRes.json()

    const movies: EagleWingMovie[] = []
    const showtimes: EagleWingShowtime[] = []

    // Step 3+4: for each movie, get ScheduledFilmId and fetch sessions
    for (const film of rawFilms) {
      const urlMatch = film.link?.match(/\/movie\/([^/]+)\/([^/]+)$/)
      if (!urlMatch) continue

      const slug = urlMatch[1]
      const filmCode = urlMatch[2]

      // Navigate to movie page to get ScheduledFilmId from window.Vars
      try {
        await d.get(`${BASE_URL}/movie/${slug}/${filmCode}`)
        await d.sleep(2000)

        const scheduledFilmId = await d.executeScript<string>(
          `return window.Vars?.ScheduledFilmId ?? ''`,
        )
        const cinemaId = await d.executeScript<string>(
          `return window.Vars?.CinemaId ?? '0000000001'`,
        )

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

        // Step 4: POST time-scheduled to get all sessions at once
        const sessionsRes = await fetch(`${BASE_URL}/api/v1/film/time-scheduled`, {
          method: 'POST',
          headers: buildHeaders(csrfToken, xsrfToken, cookieString),
          body: JSON.stringify({
            movie: { Title: film.title, Rating: film.rating },
            cinema_id: cinemaId,
            scheduledfilm_id: scheduledFilmId,
          }),
        })

        if (!sessionsRes.ok) continue

        const sessionsData = await sessionsRes.json()
        const filmGroups: any[] = sessionsData?.films ?? []

        // Collect all sessions across halls, group by date
        const sessionsByDate = new Map<string, EagleWingSession[]>()

        for (const group of filmGroups) {
          const hall: string = group?.ScreenName ?? ''
          const times = group?.times ?? {}

          for (const [, daySessions] of Object.entries(times)) {
            for (const s of daySessions as any[]) {
              const screen = s?.screen ?? {}
              const raw: string = screen?.raw ?? ''
              if (!raw) continue

              const date = raw.split('T')[0]
              const time: string = screen?.time ?? s?.time ?? ''
              const timeId: string = String(screen?.stamp ?? s?.id ?? `${movieId}-${raw}`)
              const bookingUrl: string = s?.link ?? `${BASE_URL}/movies`

              const session: EagleWingSession = {
                id: Number(timeId),
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
  } finally {
    if (driver) await safeQuitDriver(driver)
  }
}
