import { WebDriver, until, By } from 'selenium-webdriver'
import { createChromeDriver, safeQuitDriver } from '../../../utils/selenium-config'
import { Cinema } from './types'

const SHAW_BASE = 'https://shaw.sg'

let cachedCookies: string | null = null

/**
 * Navigates to shaw.sg with Selenium and extracts all session cookies.
 * Result is module-cached so the browser only opens once per scrape run.
 */
export const getShawCookies = async (): Promise<string> => {
  if (cachedCookies) return cachedCookies

  let driver: WebDriver | null = null
  try {
    driver = await createChromeDriver()
    const d = driver

    await d.get(SHAW_BASE)
    await d.wait(
      until.elementLocated(By.css('body')),
      20000,
    )

    // Wait briefly for the SPA to initialise session cookies
    await d.sleep(2000)

    const cookies = await d.manage().getCookies()
    cachedCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    return cachedCookies
  } finally {
    if (driver) await safeQuitDriver(driver)
  }
}

const buildHeaders = (cookies: string, extra: Record<string, string> = {}): Record<string, string> => ({
  accept: '*/*',
  'accept-language': 'en-SG,en;q=0.9',
  'content-type': 'application/json',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  Referer: `${SHAW_BASE}/`,
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  cookie: cookies,
  ...extra,
})

const shawFetch = async (url: string, cookies: string): Promise<any> => {
  const res = await fetch(url, {
    headers: buildHeaders(cookies),
    method: 'GET',
  })
  if (!res.ok) throw new Error(`Shaw API ${url} returned ${res.status}`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error(`Shaw API ${url} returned HTML — session may be invalid`)
  }
  return JSON.parse(text)
}

export const fetchFilmFestival = async (code: string, cookies: string) =>
  shawFetch(`${SHAW_BASE}/get_film_festival_movies?code=${code}`, cookies)

export const fetchNowShowingMoviesList = (cookies: string) =>
  shawFetch(`${SHAW_BASE}/get_now_showing_movies`, cookies)

export const fetchAdvanceMoviesList = (cookies: string) =>
  shawFetch(`${SHAW_BASE}/get_advance_sale_movies`, cookies)

export const fetchComingMoviesList = (cookies: string) =>
  shawFetch(`${SHAW_BASE}/get_coming_soon_movies`, cookies)

export const fetchCinemaList = (cookies: string): Promise<Cinema[]> =>
  shawFetch(`${SHAW_BASE}/get_simple_locations`, cookies)

const getDateString = (dateValue: Date) =>
  dateValue.toLocaleDateString('swe', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

export const getDateShowtimes = async (date: Date, cookies: string) => {
  const dateString = getDateString(date)
  return shawFetch(
    `${SHAW_BASE}/get_show_times?${new URLSearchParams({
      date: dateString,
      movieId: '0',
      locationId: '0',
      locationBrand: '0',
      promotionId: '0',
    })}`,
    cookies,
  )
}
