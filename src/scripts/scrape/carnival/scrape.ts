import { createHmac } from 'crypto'
import { CarnivalMovie, CarnivalShowtime, CarnivalShowtimeSession } from './types'

const BASE_URL = 'https://service.carnivalcinemas.sg/api/QuickSearch'
// The backend uses 'Mumbai' as the location identifier for Singapore cinemas
const LOCATION = 'Mumbai'

// Token generation constants extracted from carnivalcinemas.sg/Scripts/AllJavaScripts
const MOVIECODE = 'rz8LuOtFBXphj9WQfvFh'
const SITE_URL = 'https://carnivalcinemas.sg/#/'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let cachedKey: string | null = null

/**
 * Generates the Carnival API auth token using the same HMAC-SHA256 algorithm
 * as the browser's cinemaManager.generate() function, without needing Selenium.
 *
 * Token structure: Base64(hmac_b64 + "|" + site_url + "|" + .NET_ticks + "|" + moviecode)
 * where hmac_b64 = Base64(HMAC-SHA256(userAgent + "|" + ticks, key_b64))
 * and   key_b64  = Base64(HMAC-SHA256(site_url + "|" + moviecode, moviecode))
 */
export const generateToken = (): string => {
  if (!cachedKey) {
    cachedKey = createHmac('sha256', MOVIECODE)
      .update(`${SITE_URL}|${MOVIECODE}`)
      .digest('base64')
  }

  // Match browser float64 precision: ms * 1e4 + .NET epoch offset
  const t = Date.now() * 1e4 + 621355968000000000

  const hmac = createHmac('sha256', cachedKey)
    .update(`${USER_AGENT}|${t}`)
    .digest('base64')

  const payload = `${hmac}|${SITE_URL}|${t}|${MOVIECODE}`
  return Buffer.from(payload).toString('base64')
}

const buildHeaders = (token: string): Record<string, string> => ({
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  Token: token,
  Referer: 'https://carnivalcinemas.sg/',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
})

export const fetchMoviesFromApi = async (token: string): Promise<CarnivalMovie[]> => {
  const res = await fetch(
    `${BASE_URL}/GetNowPlayingMovies?location=${LOCATION}`,
    { headers: buildHeaders(token), method: 'GET' },
  )
  if (!res.ok) throw new Error(`Carnival movies API returned ${res.status}`)
  const data = await res.json()
  if (data?.responseError?.ErrorCode !== '200') {
    throw new Error(`Carnival movies API error: ${data?.responseError?.ErrorMessage}`)
  }
  const movies: any[] = data?.responseMovies ?? []
  return movies.map((m: any) => ({
    code: m.code ?? m.Code ?? '',
    name: m.name ?? m.Name ?? '',
    censor: m.censor ?? m.Censor ?? '',
    language: m.language ?? m.Language ?? '',
    duration: Number(m.duration ?? m.Duration ?? 0),
    genre: m.genre ?? m.Genre ?? '',
    description: m.description ?? m.Description ?? '',
    openingDate: m.openingDate ?? m.OpeningDate ?? '',
    imageURL: m.imageURL ?? m.ImageURL ?? '',
    actor: m.actor ?? m.Actor ?? '',
    director: m.director ?? m.Director ?? '',
    YouTubeURL: m.youTubeURL ?? m.YouTubeURL ?? m.youtubeUrl ?? '',
  }))
}

export const fetchShowtimesForDate = async (
  token: string,
  movieCode: string,
  date: string,
): Promise<CarnivalShowtime> => {
  try {
    const res = await fetch(
      `${BASE_URL}/GetCinemaAndShowTimeByMovie?location=${LOCATION}&movieCode=${encodeURIComponent(movieCode)}&date=${date}`,
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
  // API returns a flat array where each entry is one session at one cinema
  const list: any[] = Array.isArray(data)
    ? data
    : (data?.responseCinemaWithShowTime ?? [])

  const cinemaMap = new Map<string, { cinemaName: string; cinemaAddress: string; sessions: CarnivalShowtimeSession[] }>()

  for (const item of list) {
    const cinemaName: string = item?.cinemaName ?? item?.CinemaName ?? ''
    const cinemaAddress: string = item?.CinemaAddress ?? item?.cinemaAddress ?? ''
    // showTime has a trailing 'T' separator artifact: " 02:00 PMT" → "02:00 PM"
    const rawTime: string = (item?.showTime ?? item?.ShowTime ?? '').trim()
    const showTime: string = rawTime.replace(/T$/i, '').trim()
    const showId: string = String(item?.longSessionID ?? item?.LongSessionId ?? `${movieCode}-${date}-${showTime}`).trim()

    if (!cinemaMap.has(cinemaName)) {
      cinemaMap.set(cinemaName, { cinemaName, cinemaAddress, sessions: [] })
    }

    cinemaMap.get(cinemaName)!.sessions.push({
      showId,
      showTime,
      format: '2D',
      screen: '',
      bookingLink: 'https://carnivalcinemas.sg/',
    })
  }

  return { movieCode, date, groups: Array.from(cinemaMap.values()) }
}
