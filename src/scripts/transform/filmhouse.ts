import { StandardShowtime } from '@/types/standard'
import { makeTransformCinemas, makeTransformMovies } from './factory'
import { BaseTransformer } from './base'
import logger from '@/utils/logger'

interface RawFilmhouseCinema {
  id: string
  name: string
  address: string
}

interface RawFilmhouseMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
}

interface RawFilmhouseSession {
  id: string
  filmId: string
  screenId: string
  screenName: string
  startTime: string
  attributes: string[]
  bookingUrl: string
}

const parseFormat = (attributes: string[]): string => {
  if (!attributes || attributes.length === 0) return '2D'
  const joined = attributes.join(' ').toUpperCase()
  if (joined.includes('4DX')) return '4DX'
  if (joined.includes('IMAX')) return 'IMAX'
  if (joined.includes('3D')) return '3D'
  if (joined.includes('DOLBY')) return 'Dolby'
  return attributes[0] || '2D'
}

class FilmhouseTransformer extends BaseTransformer {
  readonly chain = 'filmhouse'

  transformCinemas = makeTransformCinemas<RawFilmhouseCinema>({
    chain: 'filmhouse',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies = makeTransformMovies<RawFilmhouseMovie>({
    chain: 'filmhouse',
    getId: m => m.id,
    getTitle: m => m.title,
    getLanguage: m => m.language,
    getDetails: m => ({ genre: m.genre }),
  })

  transformShowtimes(rawSessions: unknown[]): StandardShowtime[] {
    const sessions = rawSessions as RawFilmhouseSession[]
    const skippedCount = sessions.filter(s => !s.startTime || !s.filmId).length
    if (skippedCount > 0)
      logger.warn(`[filmhouse] ${skippedCount} sessions skipped: missing startTime or filmId`)

    return sessions
      .filter(s => s.startTime && s.filmId)
      .map(s => {
        const format = parseFormat(s.attributes)
        return {
          id: `filmhouse:${s.id}`,
          filmId: `filmhouse:${s.filmId}`,
          cinemaId: 'filmhouse:1',
          unixTime: new Date(s.startTime).getTime(),
          link: s.bookingUrl || 'https://filmhouse.com.sg/',
          ticketType: { label: format, type: format },
          movieFormat: format,
          details: { screen: s.screenName, showTime: s.startTime, screenId: s.screenId },
        }
      })
  }
}

const transformer = new FilmhouseTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
