import { Cinema } from './types'

const SHAW_BASE = 'https://shaw.sg'

const SHAW_HEADERS: Record<string, string> = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-SG,en;q=0.9',
  'content-type': 'application/json',
  'x-api-forward-to': 'internal',
  'x-app': 'PWSM',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  Referer: `${SHAW_BASE}/`,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

const shawFetch = async (url: string): Promise<any> => {
  const res = await fetch(url, {
    headers: SHAW_HEADERS,
    method: 'GET',
  })
  if (!res.ok) throw new Error(`Shaw API ${url} returned ${res.status}`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error(`Shaw API ${url} returned HTML — endpoint may have changed`)
  }
  return JSON.parse(text)
}

/**
 * Returns combined list of movies (type:1), cinemas (type:2), and dates (type:0).
 */
export const fetchSelectors = async (): Promise<any[]> =>
  shawFetch(`${SHAW_BASE}/internal/get_selectors?cache=no-cache`)

export const fetchCinemaList = async (): Promise<Cinema[]> =>
  shawFetch(`${SHAW_BASE}/internal/get_simple_locations`)

const getDateString = (dateValue: Date) =>
  dateValue.toLocaleDateString('swe', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

export const getDateShowtimes = async (date: Date) => {
  const dateString = getDateString(date)
  return shawFetch(
    `${SHAW_BASE}/internal/get_show_times?${new URLSearchParams({
      date: dateString,
      movieId: '0',
      locationId: '0',
      promotionId: '0',
    })}`,
  )
}
