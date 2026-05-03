import { WebDriver } from 'selenium-webdriver'
import { createChromeDriver, safeQuitDriver } from '../../../utils/selenium-config'
import { EagleWingMovie, EagleWingSession, EagleWingShowtime } from './types'

const BASE_URL = 'https://www.eaglewingscinematics.com.sg'

/**
 * Navigates to EagleWings and extracts CSRF + XSRF tokens from cookies/meta tags
 * before making API calls that require them.
 */
export const getTokens = async (): Promise<{ csrfToken: string; xsrfToken: string }> => {
  let driver: WebDriver | null = null
  try {
    driver = await createChromeDriver()
    const d = driver

    const cdp = await (d as any).createCDPConnection('page')
    await cdp.execute('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__eagleTokens = { csrf: null, xsrf: null };
        const _origFetch = window.fetch;
        window.fetch = function(url, opts) {
          if (typeof url === 'string' && url.includes('eaglewingscinematics')) {
            const h = opts && opts.headers ? opts.headers : {};
            if (h['x-csrf-token']) window.__eagleTokens.csrf = h['x-csrf-token'];
            if (h['x-xsrf-token']) window.__eagleTokens.xsrf = h['x-xsrf-token'];
          }
          return _origFetch.apply(this, arguments);
        };
        const _origXHR = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
          if (name.toLowerCase() === 'x-csrf-token') window.__eagleTokens.csrf = value;
          if (name.toLowerCase() === 'x-xsrf-token') window.__eagleTokens.xsrf = value;
          return _origXHR.apply(this, arguments);
        };
      `,
    })

    await d.get(`${BASE_URL}/movies`)

    const tokens = await d.wait(
      async () => {
        const result = await d.executeScript<{ csrf: string | null; xsrf: string | null }>(
          'return window.__eagleTokens',
        )
        return result?.csrf ? result : null
      },
      20000,
      'Timed out waiting for EagleWings tokens',
    )

    if (!tokens?.csrf) throw new Error('Failed to capture EagleWings CSRF token')
    return { csrfToken: tokens.csrf, xsrfToken: tokens.xsrf ?? '' }
  } finally {
    if (driver) await safeQuitDriver(driver)
  }
}

const buildHeaders = (csrfToken: string, xsrfToken: string): Record<string, string> => ({
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-csrf-token': csrfToken,
  'x-xsrf-token': xsrfToken,
  'x-requested-with': 'XMLHttpRequest',
  Referer: `${BASE_URL}/movies`,
})

export const fetchMoviesFromApi = async (
  csrfToken: string,
  xsrfToken: string,
): Promise<EagleWingMovie[]> => {
  const res = await fetch(`${BASE_URL}/api/v1/film/showings`, {
    headers: buildHeaders(csrfToken, xsrfToken),
    method: 'GET',
  })
  if (!res.ok) throw new Error(`EagleWings movies API returned ${res.status}`)
  const data = await res.json()
  return parseMovies(data)
}

const parseMovies = (data: any): EagleWingMovie[] => {
  const list: any[] = Array.isArray(data)
    ? data
    : (data?.data ?? data?.films ?? data?.movies ?? data?.results ?? [])

  return list.map((item: any, idx: number) => ({
    id: item?.id ?? item?.film_id ?? idx,
    slug: item?.slug ?? item?.film_slug ?? String(item?.id ?? idx),
    title: item?.title ?? item?.film_title ?? item?.name ?? '',
    rating: item?.rating ?? item?.classification ?? '',
    language: item?.language ?? '',
    genre: item?.genre ?? item?.category ?? '',
    duration: Number(item?.duration ?? item?.runtime ?? 0),
    synopsis: item?.synopsis ?? item?.description ?? '',
    posterUrl: item?.poster ?? item?.image ?? item?.poster_url ?? '',
    openingDate: item?.opening_date ?? item?.release_date ?? item?.openingdate ?? '',
  }))
}

export const fetchShowtimesForMovie = async (
  csrfToken: string,
  xsrfToken: string,
  movieSlug: string,
  movieId: number,
  date: string,
): Promise<EagleWingShowtime> => {
  try {
    const res = await fetch(
      `${BASE_URL}/api/v1/film/${encodeURIComponent(movieSlug)}/sessions?date=${date}`,
      { headers: buildHeaders(csrfToken, xsrfToken), method: 'GET' },
    )
    if (!res.ok) return { movieId, movieSlug, date, sessions: [] }
    const data = await res.json()
    return parseSessions(data, movieId, movieSlug, date)
  } catch {
    return { movieId, movieSlug, date, sessions: [] }
  }
}

const parseSessions = (
  data: any,
  movieId: number,
  movieSlug: string,
  date: string,
): EagleWingShowtime => {
  const list: any[] = Array.isArray(data)
    ? data
    : (data?.data ?? data?.sessions ?? data?.showtimes ?? [])

  const sessions: EagleWingSession[] = list.map((item: any) => ({
    id: item?.id ?? item?.session_id ?? item?.performance_id ?? 0,
    date: item?.date ?? date,
    time: item?.time ?? item?.show_time ?? item?.start_time ?? '',
    hall: item?.hall ?? item?.screen ?? item?.cinema ?? '',
    format: item?.format ?? item?.dimension ?? item?.type ?? '2D',
    bookingUrl: item?.booking_url ?? item?.link ?? item?.ticket_url ?? `${BASE_URL}/ticket/${movieSlug}`,
  }))

  return { movieId, movieSlug, date, sessions }
}
