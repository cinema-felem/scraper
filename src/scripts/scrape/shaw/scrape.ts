import httpClient from '../../../utils/http-client'
import { Cinema, MovieShowtime, ShowTime, MovieShowtimeRaw } from './types' // Added MovieShowtimeRaw

/**
 * Fetches movies for a specific film festival from Shaw's API.
 * @param {string} code - The code for the film festival.
 * @returns {Promise<any>} A promise that resolves with the list of film festival movies.
 *                         (Using `any` as the specific movie type isn't defined here, assuming it's Movie[] or similar)
 */
export const fetchFilmFestival = async (code: string): Promise<any> => {
  return httpClient(`https://shaw.sg/get_film_festival_movies?code=${code}`, {
    method: 'GET',
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'cache-control': 'max-age=0',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'service-worker-navigation-preload': 'true',
      'upgrade-insecure-requests': '1',
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    mode: 'cors',
    credentials: 'include',
  })
}

/**
 * Fetches the list of movies currently showing from Shaw's API.
 * @returns {Promise<any>} A promise that resolves with the list of now showing movies.
 *                         (Using `any` for now, should be `Movie[]` based on `shaw/index.ts`)
 */
export const fetchNowShowingMoviesList = (): Promise<any> =>
  httpClient('https://shaw.sg/get_now_showing_movies', {
    method: 'GET',
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'cache-control': 'max-age=0',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'service-worker-navigation-preload': 'true',
      'upgrade-insecure-requests': '1',
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    mode: 'cors',
    credentials: 'include',
  })

/**
 * Fetches the list of movies available for advance sales from Shaw's API.
 * @returns {Promise<any>} A promise that resolves with the list of movies for advance sales.
 *                         (Using `any` for now, should be `Movie[]`)
 */
export const fetchAdvanceMoviesList = (): Promise<any> =>
  httpClient('https://shaw.sg/get_advance_sale_movies', {
    method: 'GET',
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'cache-control': 'max-age=0',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'service-worker-navigation-preload': 'true',
      'upgrade-insecure-requests': '1',
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    mode: 'cors',
    credentials: 'include',
  })

/**
 * Fetches the list of movies coming soon from Shaw's API.
 * @returns {Promise<any>} A promise that resolves with the list of coming soon movies.
 *                         (Using `any` for now, should be `Movie[]`)
 */
export const fetchComingMoviesList = (): Promise<any> =>
  httpClient('https://shaw.sg/get_coming_soon_movies', {
    method: 'GET',
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'cache-control': 'max-age=0',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'service-worker-navigation-preload': 'true',
      'upgrade-insecure-requests': '1',
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    mode: 'cors',
    credentials: 'include',
  })

/**
 * Fetches the list of Shaw cinemas.
 * @returns {Promise<Cinema[]>} A promise that resolves with the list of cinemas.
 */
export const fetchCinemaList = (): Promise<Cinema[]> =>
  httpClient('https://shaw.sg/get_simple_locations', {
    method: 'GET',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      priority: 'u=1, i',
      // sec-ch-ua, sec-ch-ua-platform will be from httpClient defaults
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      // This cookie is very long and might be session-specific or unnecessary.
      // If critical, it should be managed carefully. For now, keeping as is.
      cookie:
        '_fbp=fb.1.1704272398099.1547483012; ai_user=VrEgw4NbCGiNi20zM31fwj|2024-01-03T08:59:59.007Z; zarget_user_id=f881b1c2-12cb-4063-a17f-28a8441047da; f881b1c2-12cb-4063-a17f-28a8441047da=1; f881b1c2-12cb-4063-a17f-28a8441047da=1; _tt_enable_cookie=1; _ttp=TEU5pA3KQ4ggnrPbbmT3mOlbi-9; _ga=GA1.1.590601271.1704272397; _ga_372J8T8YYJ=GS1.1.1712904106.1.1.1712904131.35.0.0; .AspNetCore.Session=CfDJ8BAOICutCa9Bv1xuokPnZp3n9tlkkMXduTUawbfajyuB4TzXvUaYGkrkTaGYBeCiDK%2BYQthupgYaN3zJuntFL7r67jTW7YfJzOuuoufQLM3QQJytZGcfxJy9d24Ppt%2BCwNqPS3SD7jOwDX2TZ2L8gD8CdOMrNFH4J0icnd44dZv4; .AspNetCore.Antiforgery.9fXoN5jHCXs=CfDJ8BAOICutCa9Bv1xuokPnZp3MNPWvvXzHqTwtK1mThUaLI6ZJXpJ_xYoQi5y_v6pf-OzopbGNZBmbHrYI3l-39Z0LKz5oPUlvVlzB6g0jIYTUQySN_4BARQ3XsZFFiGKw57iKjdWLmfnF3550fxUMyG0; x-ms-routing-name=self; TiPMix=65.97875295854602; com.bugpilot.report.id=73267de5-6125-4b47-9c67-e04468f5ff47:r1-Ltu5Sasni6ISumf-9Od7y; ai_session=uGNK5EDWMsrhg5rc+3/O2v|1714371279064|1714371305631; _ga_5PQBYJ3D2R=GS1.1.1714371275.41.1.1714371322.0.0.0',
      Referer: 'https://shaw.sg/Showtimes/2024-04-29/All/no-referrer',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })

/**
 * Formats a Date object into a 'YYYY-MM-DD' string.
 * @param {Date} dateValue - The date to format.
 * @returns {string} The formatted date string.
 */
const getDateString = (dateValue: Date): string => {
  // Output format: YYYY-MM-DD
  return dateValue.toLocaleDateString('swe', {
    // Swedish locale gives YYYY-MM-DD
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Fetches showtimes for a specific date from Shaw's API.
 * @param {Date} date - The date for which to fetch showtimes.
 * @returns {Promise<MovieShowtimeRaw[]>} A promise that resolves with the raw movie showtime data for that date.
 *                                      (Using MovieShowtimeRaw[] as per shaw/index.ts)
 */
export const getDateShowtimes = async (
  date: Date,
): Promise<MovieShowtimeRaw[]> => {
  const dateString = getDateString(date)
  const url =
    `https://shaw.sg/get_show_times?` +
    new URLSearchParams({
      date: dateString,
      movieId: '0', // API seems to accept '0' for all movies
      locationId: '0', // API seems to accept '0' for all locations
      locationBrand: '0', // API seems to accept '0' for all brands
      promotionId: '0',
    })

  return httpClient(url, {
    method: 'GET',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
      priority: 'u=1, i',
      'request-id': '|d8c90bee042a46a284494294e5f7c998.b523511f9d4943a0', // This seems like a tracking ID, might need to be dynamic or removed if not essential
      // sec-ch-ua, sec-ch-ua-platform will be from httpClient defaults
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      traceparent: '00-d8c90bee042a46a284494294e5f7c998-b523511f9d4943a0-01', // Similar to request-id
      // This cookie is very long and might be session-specific or unnecessary.
      cookie:
        '_fbp=fb.1.1704272398099.1547483012; ai_user=VrEgw4NbCGiNi20zM31fwj|2024-01-03T08:59:59.007Z; zarget_user_id=f881b1c2-12cb-4063-a17f-28a8441047da; f881b1c2-12cb-4063-a17f-28a8441047da=1; f881b1c2-12cb-4063-a17f-28a8441047da=1; _tt_enable_cookie=1; _ttp=TEU5pA3KQ4ggnrPbbmT3mOlbi-9; _ga=GA1.1.590601271.1704272397; _ga_372J8T8YYJ=GS1.1.1712904106.1.1.1712904131.35.0.0; .AspNetCore.Session=CfDJ8BAOICutCa9Bv1xuokPnZp3n9tlkkMXduTUawbfajyuB4TzXvUaYGkrkTaGYBeCiDK%2BYQthupgYaN3zJuntFL7r67jTW7YfJzOuuoufQLM3QQJytZGcfxJy9d24Ppt%2BCwNqPS3SD7jOwDX2TZ2L8gD8CdOMrNFH4J0icnd44dZv4; .AspNetCore.Antiforgery.9fXoN5jHCXs=CfDJ8BAOICutCa9Bv1xuokPnZp3MNPWvvXzHqTwtK1mThUaLI6ZJXpJ_xYoQi5y_v6pf-OzopbGNZBmbHrYI3l-39Z0LKz5oPUlvVlzB6g0jIYTUQySN_4BARQ3XsZFFiGKw57iKjdWLmfnF3550fxUMyG0; x-ms-routing-name=self; TiPMix=65.97875295854602; com.bugpilot.report.id=73267de5-6125-4b47-9c67-e04468f5ff47:r1-Ltu5Sasni6ISumf-9Od7y; ai_session=uGNK5EDWMsrhg5rc+3/O2v|1714371279064|1714371305631; _ga_5PQBYJ3D2R=GS1.1.1714371275.41.1.1714371322.0.0.0',
      Referer: `https://shaw.sg/Showtimes/${dateString}/All/no-referrer`,
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })
}
