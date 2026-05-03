import { StandardShowtime } from '@/types/standard'
import { toSingaporeUnixMsFrom12h } from '@/utils/time'
import { makeTransformCinemas, makeTransformMovies } from './factory'
import { BaseTransformer } from './base'
import logger from '@/utils/logger'

interface RawEagleWingCinema {
  id: string
  name: string
  address: string
}

interface RawEagleWingMovie {
  id: number
  slug: string
  title: string
  language: string
  genre: string
  duration: number
}

interface RawEagleWingSession {
  id: string
  date: string
  time: string
  hall: string
  format: string
  bookingUrl: string
}

interface RawEagleWingShowtime {
  movieId: number
  movieSlug: string
  date: string
  sessions: RawEagleWingSession[]
}

class EagleWingTransformer extends BaseTransformer {
  readonly chain = 'eaglewing'

  transformCinemas = makeTransformCinemas<RawEagleWingCinema>({
    chain: 'eaglewing',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies = makeTransformMovies<RawEagleWingMovie>({
    chain: 'eaglewing',
    getId: m => String(m.id),
    getTitle: m => m.title,
    getLanguage: m => m.language,
    getDetails: m => ({ genre: m.genre, slug: m.slug }),
  })

  transformShowtimes(rawShowtimes: unknown[]): StandardShowtime[] {
    const showtimes = rawShowtimes as RawEagleWingShowtime[]
    const allSessions = showtimes.flatMap(st => st.sessions)
    const skippedCount = allSessions.filter(s => !s.time).length
    if (skippedCount > 0)
      logger.warn(`[eaglewing] ${skippedCount} sessions skipped: missing time`)

    return showtimes.flatMap(({ movieId, date, sessions }) =>
      sessions
        .filter(s => s.time)
        .map(s => ({
          id: `eaglewing:${s.id}`,
          filmId: `eaglewing:${movieId}`,
          cinemaId: 'eaglewing:1',
          unixTime: toSingaporeUnixMsFrom12h(s.date || date, s.time),
          link: s.bookingUrl || 'https://www.eaglewingscinematics.com.sg/',
          ticketType: { label: s.format || '2D', type: s.format || '2D' },
          movieFormat: s.format || '2D',
          details: { screen: s.hall, showTime: s.time, date: s.date || date },
        })),
    )
  }
}

const transformer = new EagleWingTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
