import { scrapeShowtimes } from './scrape'
import { OldhamCinema, OldhamMovie, OldhamShowtime } from './types'

let inFlight: Promise<{ movies: OldhamMovie[]; showtimes: OldhamShowtime[] }> | null = null

const getData = () => {
  if (!inFlight) inFlight = scrapeShowtimes()
  return inFlight
}

export const fetchCinemas = async (): Promise<OldhamCinema[]> => [
  {
    id: 'oldham-theatre',
    name: 'Oldham Theatre',
    address: '1 Canning Rise, Level 3, National Archives Building, Singapore 179868',
  },
]

export const fetchMovies = async (): Promise<OldhamMovie[]> => (await getData()).movies

export const fetchShowtimes = async (): Promise<OldhamShowtime[]> => (await getData()).showtimes
