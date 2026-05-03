import { fetchFilmsAndSessions } from './scrape'
import { FilmhouseMovie, FilmhouseSession } from './types'

export interface FilmhouseCinema {
  id: string
  name: string
  address: string
}

export const fetchCinemas = async (): Promise<FilmhouseCinema[]> => [
  {
    id: '1',
    name: 'Filmhouse',
    address: '8 Grange Road, #04-01/07, Cathay Cineleisure Orchard, Singapore 239695',
  },
]

export const fetchMovies = async (): Promise<FilmhouseMovie[]> => {
  const { movies } = await fetchFilmsAndSessions()
  return movies
}

export const fetchShowtimes = async (): Promise<FilmhouseSession[]> => {
  const { sessions } = await fetchFilmsAndSessions()
  return sessions
}
