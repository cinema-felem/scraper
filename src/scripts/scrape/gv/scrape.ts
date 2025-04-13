import { CinemaResponse, CinemaShowtimeResponse, MovieResponse } from './types'

export const fetchShowingMovieList = (): Promise<MovieResponse> =>
  fetch('https://www.gv.com.sg/.gv-api/nowshowing', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVMovies',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'POST',
  }).then(res => res.json())

export const fetchComingSoonMoviesList = (): Promise<MovieResponse> =>
  fetch('https://www.gv.com.sg/.gv-api/comingsoon', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVMovies',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'POST',
  }).then(res => res.json())

export const fetchAdvancedSalesMoviesList = (): Promise<MovieResponse> =>
  fetch('https://www.gv.com.sg/.gv-api/comingsoon', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVMovies',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'POST',
  }).then(res => res.json())

export const fetchDateShowtimes = async (
  date: number,
): Promise<CinemaShowtimeResponse> => {
  return fetch('https://www.gv.com.sg/.gv-api/v2buytickets', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language':
        'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
      'content-type': 'application/json; charset=UTF-8',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVBuyTickets',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `{"cinemaId":"","filmCode":"","date":${date},"advanceSales":false}`,
    method: 'POST',
  }).then(res => res.json())
}

export const fetchCinemasApi = async (): Promise<CinemaResponse> =>
  fetch('https://www.gv.com.sg/.gv-api/cinemas', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language':
        'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVBuyTickets',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'POST',
  }).then(res => res.json())
