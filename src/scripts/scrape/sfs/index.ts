import { scrapeShowtimes } from './scrape'
import { SFSMovie, SFSShowtime } from './types'

export interface SFSCinema {
  id: string
  name: string
  address: string
}

export const fetchCinemas = async (): Promise<SFSCinema[]> => [
  {
    id: '1',
    name: 'SFS Somerset (Hall 6)',
    address: '8 Grange Road, #06-01, Cathay Cineleisure Orchard, Singapore 239695',
  },
]

export const fetchMovies = async (): Promise<SFSMovie[]> => {
  const { movies } = await scrapeShowtimes()
  return movies
}

export const fetchShowtimes = async (): Promise<SFSShowtime[]> => {
  const { showtimes } = await scrapeShowtimes()
  return showtimes
}
