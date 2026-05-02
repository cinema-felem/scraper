import { WebDriver } from 'selenium-webdriver'
import { createChromeDriver, safeQuitDriver } from '../../../utils/selenium-config'
import { FilmhouseMovie, FilmhouseScreen, FilmhouseSession } from './types'

const VEEZI_BASE = 'https://api.oz.veezi.com/v1'
const FILMHOUSE_SITE = 'https://filmhouse.com.sg'

/**
 * Navigates to Filmhouse and captures the VeeziAccessToken from the SPA's
 * first request to the Veezi API via CDP fetch interception.
 */
export const getVeeziToken = async (): Promise<string> => {
  let driver: WebDriver | null = null
  try {
    driver = await createChromeDriver()

    const cdp = await (driver as any).createCDPConnection('page')
    await cdp.execute('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__veeziToken = null;
        const _origFetch = window.fetch;
        window.fetch = function(url, opts) {
          if (typeof url === 'string' && url.includes('veezi.com')) {
            const h = opts && opts.headers ? opts.headers : {};
            const token = h['VeeziAccessToken'] || h['veeziAccessToken'] || h['veezitoken'] || h['accesstoken'];
            if (token) window.__veeziToken = token;
          }
          return _origFetch.apply(this, arguments);
        };
        const _origOpen = XMLHttpRequest.prototype.open;
        const _origXHRSend = XMLHttpRequest.prototype.setRequestHeader;
        window.__pendingXHR = null;
        XMLHttpRequest.prototype.open = function(method, url) {
          if (typeof url === 'string' && url.includes('veezi.com')) {
            this.__isVeezi = true;
          }
          return _origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
          if (this.__isVeezi && name.toLowerCase().includes('veezi')) {
            window.__veeziToken = value;
          }
          return _origXHRSend.apply(this, arguments);
        };
      `,
    })

    await driver.get(FILMHOUSE_SITE)

    const token = await driver.wait(
      async () => driver.executeScript<string | null>('return window.__veeziToken'),
      25000,
      'Timed out waiting for Veezi access token',
    )

    if (!token) throw new Error('Failed to capture Veezi access token from Filmhouse')
    return token
  } finally {
    await safeQuitDriver(driver)
  }
}

const buildHeaders = (veeziToken: string): Record<string, string> => ({
  VeeziAccessToken: veeziToken,
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
  Referer: `${FILMHOUSE_SITE}/`,
})

export const fetchMoviesFromApi = async (veeziToken: string): Promise<FilmhouseMovie[]> => {
  const res = await fetch(`${VEEZI_BASE}/film`, {
    headers: buildHeaders(veeziToken),
    method: 'GET',
  })
  if (!res.ok) throw new Error(`Filmhouse (Veezi) films API returned ${res.status}`)
  const data = await res.json()
  return parseMovies(data)
}

const parseMovies = (data: any): FilmhouseMovie[] => {
  const list: any[] = Array.isArray(data) ? data : (data?.results ?? data?.films ?? [])
  return list.map((item: any) => ({
    id: item?.FilmId ?? item?.Id ?? item?.id ?? '',
    title: item?.Title ?? item?.title ?? item?.Name ?? '',
    rating: item?.Rating ?? item?.ClassificationCode ?? item?.rating ?? '',
    language: item?.Language ?? item?.OriginalLanguage ?? '',
    genre: item?.GenreGroup ?? item?.Genre ?? item?.genre ?? '',
    duration: Number(item?.RunTime ?? item?.Duration ?? item?.runtime ?? 0),
    synopsis: item?.Synopsis ?? item?.Description ?? item?.synopsis ?? '',
    posterUrl: item?.PosterUrl ?? item?.ThumbnailUrl ?? item?.posterUrl ?? '',
    trailerUrl: item?.TrailerUrl ?? item?.trailerUrl ?? '',
    openingDate: item?.OpeningDate ?? item?.ReleaseDate ?? item?.openingDate ?? '',
  }))
}

export const fetchScreensFromApi = async (veeziToken: string): Promise<FilmhouseScreen[]> => {
  const res = await fetch(`${VEEZI_BASE}/screen`, {
    headers: buildHeaders(veeziToken),
    method: 'GET',
  })
  if (!res.ok) return []
  const data = await res.json()
  const list: any[] = Array.isArray(data) ? data : (data?.results ?? [])
  return list.map((item: any) => ({
    id: String(item?.ScreenId ?? item?.Id ?? item?.id ?? ''),
    name: item?.Name ?? item?.ScreenName ?? item?.name ?? '',
  }))
}

export const fetchSessionsFromApi = async (veeziToken: string): Promise<FilmhouseSession[]> => {
  const res = await fetch(`${VEEZI_BASE}/session`, {
    headers: buildHeaders(veeziToken),
    method: 'GET',
  })
  if (!res.ok) throw new Error(`Filmhouse (Veezi) sessions API returned ${res.status}`)
  const data = await res.json()
  return parseSessions(data)
}

const parseSessions = (data: any): FilmhouseSession[] => {
  const list: any[] = Array.isArray(data) ? data : (data?.results ?? data?.sessions ?? [])
  return list.map((item: any) => {
    const sessionId = String(item?.SessionId ?? item?.Id ?? item?.id ?? '')
    const filmId = String(item?.FilmId ?? item?.film_id ?? '')
    const screenId = String(item?.ScreenId ?? item?.screen_id ?? '')
    const screenName = item?.ScreenName ?? item?.screen_name ?? ''
    const startTime: string = item?.FeatureStartTime ?? item?.StartTime ?? item?.start_time ?? ''
    const attributes: string[] = Array.isArray(item?.Attributes)
      ? item.Attributes
      : typeof item?.Attributes === 'string'
      ? [item.Attributes]
      : []
    const bookingUrl = item?.BookingUrl ?? item?.booking_url ?? `${FILMHOUSE_SITE}/tickets`

    return { id: sessionId, filmId, screenId, screenName, startTime, attributes, bookingUrl }
  })
}
