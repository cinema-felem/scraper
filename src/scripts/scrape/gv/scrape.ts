import httpClient from '../../../utils/http-client'
import { CinemaResponse, CinemaShowtimeResponse, MovieResponse } from './types'

/**
 * Fetches the list of movies currently showing from GV's API.
 * @returns {Promise<MovieResponse>} A promise that resolves with the list of now showing movies.
 */
export const fetchShowingMovieList = (): Promise<MovieResponse> =>
  httpClient('https://www.gv.com.sg/.gv-api/nowshowing', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVMovies',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })

/**
 * Fetches the list of movies coming soon from GV's API.
 * @returns {Promise<MovieResponse>} A promise that resolves with the list of coming soon movies.
 */
export const fetchComingSoonMoviesList = (): Promise<MovieResponse> =>
  httpClient('https://www.gv.com.sg/.gv-api/comingsoon', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVMovies',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })

/**
 * Fetches the list of movies available for advanced sales from GV's API.
 * Note: This currently uses the same endpoint as coming soon movies.
 * @returns {Promise<MovieResponse>} A promise that resolves with the list of movies for advanced sales.
 */
export const fetchAdvancedSalesMoviesList = (): Promise<MovieResponse> =>
  httpClient('https://www.gv.com.sg/.gv-api/comingsoon', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVMovies',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })

/**
 * Fetches showtimes for a specific date from GV's API.
 * @param {number} date - The date for which to fetch showtimes, typically a Unix timestamp or a specific format GV expects.
 * @returns {Promise<CinemaShowtimeResponse>} A promise that resolves with the cinema showtime data.
 */
export const fetchDateShowtimes = async (
  date: number,
): Promise<CinemaShowtimeResponse> =>
  httpClient('https://www.gv.com.sg/.gv-api/v2buytickets', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json; charset=UTF-8',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVBuyTickets',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `{"cinemaId":"","filmCode":"","date":${date},"advanceSales":false}`,
  })

/**
 * Fetches the list of all GV cinemas from their API.
 * @returns {Promise<CinemaResponse>} A promise that resolves with the list of cinemas.
 */
export const fetchCinemasApi = async (): Promise<CinemaResponse> =>
  httpClient('https://www.gv.com.sg/.gv-api/cinemas', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVBuyTickets',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  })
