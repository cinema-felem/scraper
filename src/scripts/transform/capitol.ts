import { StandardShowtime } from '@/types/standard'
import { makeTransformCinemas, makeTransformMovies } from './factory'
import { BaseTransformer } from './base'
import logger from '@/utils/logger'

interface RawCapitolCinema {
  id: string
  name: string
  address: string
}

interface RawCapitolMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
  sisticCode: string
  startDate: string
  endDate: string
}

interface RawCapitolShowtime {
  movieId: string
  movieTitle: string
  date: string
  sisticCode: string
  sisticUrl: string
}

class CapitolTransformer extends BaseTransformer {
  readonly chain = 'capitol'

  transformCinemas = makeTransformCinemas<RawCapitolCinema>({
    chain: 'capitol',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies = makeTransformMovies<RawCapitolMovie>({
    chain: 'capitol',
    getId: m => m.id,
    getTitle: m => m.title,
    getLanguage: m => m.language || 'English',
    getDetails: m => ({
      genre: m.genre,
      synopsis: m.synopsis,
      posterUrl: m.posterUrl,
      sisticCode: m.sisticCode,
      startDate: m.startDate,
      endDate: m.endDate,
    }),
  })

  transformShowtimes(rawShowtimes: unknown[]): StandardShowtime[] {
    const showtimes = rawShowtimes as RawCapitolShowtime[]
    const skipped = showtimes.filter(s => !s.date).length
    if (skipped > 0)
      logger.warn(`[capitol] ${skipped} showtimes skipped: missing date`)

    return showtimes
      .filter(s => s.date)
      .map(s => {
        // Capitol showtimes represent the start of the film's run, not a specific session time.
        // Users follow the SISTIC link to view all dates and book individual sessions.
        const unixTime = new Date(`${s.date}T19:00:00+08:00`).getTime()
        return {
          id: `capitol:${s.sisticCode}-${s.date}`,
          filmId: `capitol:${s.movieId}`,
          cinemaId: 'capitol:capitol-theatre',
          unixTime,
          link: s.sisticUrl,
          ticketType: { label: 'Classic Film', type: 'Classic' },
          movieFormat: '4K DCP',
          details: { sisticCode: s.sisticCode, date: s.date },
        }
      })
  }
}

const transformer = new CapitolTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
