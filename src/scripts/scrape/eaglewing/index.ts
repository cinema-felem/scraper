import { getTokens, fetchMoviesFromApi, fetchShowtimesForMovie } from './scrape'
import { EagleWingMovie, EagleWingShowtime } from './types'

const DAYS_AHEAD = 7

export interface EagleWingCinema {
  id: string
  name: string
  address: string
}

export const fetchCinemas = async (): Promise<EagleWingCinema[]> => [
  {
    id: '1',
    name: 'EagleWings Cinematics',
    address: '9 King Albert Park, #B1-01, KAP Mall, Singapore 598332',
  },
]

export const fetchMovies = async (): Promise<EagleWingMovie[]> => {
  const { csrfToken, xsrfToken } = await getTokens()
  return fetchMoviesFromApi(csrfToken, xsrfToken)
}

export const fetchShowtimes = async (): Promise<EagleWingShowtime[]> => {
  const { csrfToken, xsrfToken } = await getTokens()
  const movies = await fetchMoviesFromApi(csrfToken, xsrfToken)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const showtimes: EagleWingShowtime[] = []

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    for (const movie of movies) {
      try {
        const result = await fetchShowtimesForMovie(csrfToken, xsrfToken, movie.slug, movie.id, dateStr)
        if (result.sessions.length > 0) showtimes.push(result)
      } catch (err) {
        console.error(`EagleWings: error fetching ${movie.slug} on ${dateStr}:`, err)
      }
    }
  }

  return showtimes
}
