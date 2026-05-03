import { scrapeShowtimes } from './scrape'
import { AFCinema, AFMovie, AFShowtime } from './types'

let inFlight: Promise<{ movies: AFMovie[]; showtimes: AFShowtime[] }> | null = null

const getData = () => {
  if (!inFlight) inFlight = scrapeShowtimes()
  return inFlight
}

export const fetchCinemas = async (): Promise<AFCinema[]> => [
  {
    id: 'alliance-francaise',
    name: 'Alliance Française de Singapour',
    address: '1 Sarkies Road, Singapore 258130',
  },
]

export const fetchMovies = async (): Promise<AFMovie[]> => (await getData()).movies

export const fetchShowtimes = async (): Promise<AFShowtime[]> => (await getData()).showtimes
