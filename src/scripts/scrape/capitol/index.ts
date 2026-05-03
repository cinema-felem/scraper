import { fetchCapitolFilms } from './scrape'
import { CapitolCinema, CapitolMovie, CapitolShowtime } from './types'

let inFlight: Promise<{ movies: CapitolMovie[]; showtimes: CapitolShowtime[] }> | null = null

const getData = () => {
  if (!inFlight) inFlight = fetchCapitolFilms()
  return inFlight
}

export const fetchCinemas = async (): Promise<CapitolCinema[]> => [
  {
    id: 'capitol-theatre',
    name: 'Capitol Theatre',
    address: '17 Stamford Road, Singapore 178907',
  },
]

export const fetchMovies = async (): Promise<CapitolMovie[]> => (await getData()).movies

export const fetchShowtimes = async (): Promise<CapitolShowtime[]> => (await getData()).showtimes
