import { StandardMovie, StandardShowtime } from '@/types/standard'
import { toSingaporeUnixMsFrom12h } from '@/utils/time'
import { makeTransformCinemas } from './factory'
import { BaseTransformer } from './base'
import logger from '@/utils/logger'

interface RawAFCinema {
  id: string
  name: string
  address: string
}

interface RawAFMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
}

interface RawAFShowtime {
  movieId: string
  movieTitle: string
  date: string
  time: string
  endTime: string
  eventUrl: string
}

class AllianceFrancaiseTransformer extends BaseTransformer {
  readonly chain = 'alliancefrancaise'

  transformCinemas = makeTransformCinemas<RawAFCinema>({
    chain: 'alliancefrancaise',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies(movies: unknown[]): StandardMovie[] {
    return (movies as RawAFMovie[]).map(m => ({
      id: `alliancefrancaise:${m.id}`,
      filmTitle: m.title.replace(/\r|\n|\t/g, ' ').replace(/ +/g, ' ').trim(),
      language: m.language || 'French',
      format: '',
      source: { chain: 'alliancefrancaise', id: m.id, details: { genre: m.genre } },
    }))
  }

  transformShowtimes(rawShowtimes: unknown[]): StandardShowtime[] {
    const showtimes = rawShowtimes as RawAFShowtime[]
    const skipped = showtimes.filter(s => !s.date || !s.time).length
    if (skipped > 0)
      logger.warn(`[alliancefrancaise] ${skipped} showtimes skipped: missing date or time`)

    return showtimes
      .filter(s => s.date && s.time)
      .map(s => ({
        id: `alliancefrancaise:${s.movieId}-${s.date}-${s.time.replace(/[^0-9]/g, '')}`,
        filmId: `alliancefrancaise:${s.movieId}`,
        cinemaId: 'alliancefrancaise:alliance-francaise',
        unixTime: toSingaporeUnixMsFrom12h(s.date, s.time),
        link: s.eventUrl || 'https://alliancefrancaise.org.sg/event',
        ticketType: { label: 'Film', type: 'Film' },
        movieFormat: '2D',
        details: { showTime: s.time, date: s.date },
      }))
  }
}

const transformer = new AllianceFrancaiseTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
