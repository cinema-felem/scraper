import { WebDriver } from 'selenium-webdriver'
import { createChromeDriver, safeQuitDriver } from '../../../utils/selenium-config'
import { CarnivalMovie, CarnivalShowtime } from './types'

const BASE_URL = 'https://service.carnivalcinemas.sg/api/QuickSearch'
const LOCATION = 'Singapore'

const buildHeaders = (token: string): Record<string, string> => ({
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  token,
  Referer: 'https://carnivalcinemas.sg/',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
})

/**
 * Injects a fetch interceptor before page JS runs via CDP, then navigates to
 * Carnival so the SPA's first API call exposes its signed auth token.
 */
export const getAuthToken = async (): Promise<string> => {
  let driver: WebDriver | null = null
  try {
    driver = await createChromeDriver()
    const d = driver

    const cdp = await (d as any).createCDPConnection('page')
    await cdp.execute('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__carnivalToken = null;
        const _origFetch = window.fetch;
        window.fetch = function(url, opts) {
          if (
            typeof url === 'string' &&
            url.includes('service.carnivalcinemas') &&
            opts && opts.headers && opts.headers.token
          ) {
            window.__carnivalToken = opts.headers.token;
          }
          return _origFetch.apply(this, arguments);
        };
      `,
    })

    await d.get('https://carnivalcinemas.sg/')

    const token = await d.wait(
      async () => d.executeScript<string | null>('return window.__carnivalToken'),
      20000,
      'Timed out waiting for Carnival auth token',
    )

    if (!token) throw new Error('Failed to capture Carnival auth token')
    return token
  } finally {
    if (driver) await safeQuitDriver(driver)
  }
}

export const fetchMoviesFromApi = async (token: string): Promise<CarnivalMovie[]> => {
  const res = await fetch(
    `${BASE_URL}/GetAllMovieDetail?locationName=${LOCATION}`,
    { headers: buildHeaders(token), method: 'GET' },
  )
  if (!res.ok) throw new Error(`Carnival movies API returned ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export const fetchShowtimesForDate = async (
  token: string,
  movieCode: string,
  date: string,
): Promise<CarnivalShowtime> => {
  try {
    const res = await fetch(
      `${BASE_URL}/GetCinemaAndShowTimeByMovie?location=${LOCATION}&date=${date}&movieCode=${encodeURIComponent(movieCode)}`,
      { headers: buildHeaders(token), method: 'GET' },
    )
    if (!res.ok) return { movieCode, date, groups: [] }
    const data = await res.json()
    return parseShowtimes(data, movieCode, date)
  } catch {
    return { movieCode, date, groups: [] }
  }
}

const parseShowtimes = (data: any, movieCode: string, date: string): CarnivalShowtime => {
  const cinemaList: any[] = Array.isArray(data)
    ? data
    : (data?.cinemas ?? data?.CinemaList ?? data?.data ?? [])

  const groups = cinemaList.map((cinema: any) => {
    const cinemaName: string = cinema?.CinemaName ?? cinema?.cinemaName ?? cinema?.name ?? ''
    const cinemaAddress: string = cinema?.CinemaAddress ?? cinema?.cinemaAddress ?? cinema?.address ?? ''
    const shows: any[] = cinema?.Shows ?? cinema?.ShowDetails ?? cinema?.showTimes ?? cinema?.shows ?? []

    const sessions = shows.map((show: any) => {
      const showTime: string = show?.ShowTime ?? show?.showTime ?? show?.Time ?? show?.time ?? ''
      const showId: string = String(
        show?.ShowId ?? show?.showId ?? show?.PerformanceId ?? show?.performanceId ?? `${movieCode}-${date}-${showTime}`,
      )
      return {
        showId,
        showTime,
        format: show?.Format ?? show?.format ?? show?.Dimension ?? show?.dimension ?? '2D',
        screen: show?.Screen ?? show?.screen ?? show?.Hall ?? show?.hall ?? '',
        bookingLink: show?.BookingLink ?? show?.bookingLink ?? show?.TicketLink ?? show?.ticketLink ?? '',
      }
    })

    return { cinemaName, cinemaAddress, sessions }
  })

  return { movieCode, date, groups }
}
