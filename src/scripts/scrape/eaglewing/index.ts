import { scrapeMoviesAndShowtimes } from './scrape'
import { EagleWingMovie, EagleWingShowtime } from './types'

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
  const { movies } = await scrapeMoviesAndShowtimes()
  return movies
}

export const fetchShowtimes = async (): Promise<EagleWingShowtime[]> => {
  const { showtimes } = await scrapeMoviesAndShowtimes()
  return showtimes
}
