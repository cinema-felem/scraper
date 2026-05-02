import { getVeeziToken, fetchMoviesFromApi, fetchSessionsFromApi, fetchScreensFromApi } from './scrape'
import { FilmhouseMovie, FilmhouseScreen, FilmhouseSession } from './types'

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
  const token = await getVeeziToken()
  return fetchMoviesFromApi(token)
}

export const fetchScreens = async (): Promise<FilmhouseScreen[]> => {
  const token = await getVeeziToken()
  return fetchScreensFromApi(token)
}

export const fetchSessions = async (): Promise<FilmhouseSession[]> => {
  const token = await getVeeziToken()
  return fetchSessionsFromApi(token)
}
