import { generateToken, fetchMoviesFromApi, fetchShowtimesForDate } from './scrape'
import { CarnivalMovie, CarnivalCinema, CarnivalShowtime } from './types'
import logger from '@/utils/logger'

const DAYS_AHEAD = 7

export const fetchCinemas = async (): Promise<CarnivalCinema[]> => [
  {
    id: 'golden-mile-tower',
    name: 'Carnival Cinemas Golden Mile Tower',
    address: '6001 Beach Road, #B1-01, Golden Mile Tower, Singapore 199589',
  },
  {
    id: 'shaw-tower',
    name: 'Carnival Cinemas Shaw Tower',
    address: '100 Beach Road, #B1-01, Shaw Tower, Singapore 189702',
  },
  {
    id: 'punggol',
    name: 'Carnival Cinemas Punggol',
    address: 'Punggol Dormitory, Singapore',
  },
  {
    id: 'rex-mackenzie',
    name: 'Rex Cinema Mackenzie Road',
    address: '2 Mackenzie Road, Singapore 228677',
  },
]

export const fetchMovies = async (): Promise<CarnivalMovie[]> => {
  const token = generateToken()
  return fetchMoviesFromApi(token)
}

export const fetchShowtimes = async (): Promise<CarnivalShowtime[]> => {
  const token = generateToken()
  const movies = await fetchMoviesFromApi(token)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const showtimes: CarnivalShowtime[] = []

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    for (const movie of movies) {
      try {
        const result = await fetchShowtimesForDate(token, movie.code, dateStr)
        if (result.groups.some(g => g.sessions.length > 0)) showtimes.push(result)
      } catch (err) {
        logger.error(`Carnival: error fetching ${movie.code} on ${dateStr}:`, err)
      }
    }
  }

  return showtimes
}
