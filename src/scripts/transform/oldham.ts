import { StandardCinema, StandardMovie, StandardShowtime } from '@/types/standard'
import { toSingaporeUnixMsFrom12h } from '@/utils/time'
import { makeTransformCinemas } from './factory'
import { BaseTransformer } from './base'
import logger from '@/utils/logger'
import { cleanString } from '../../text'

interface RawOldhamCinema {
  id: string
  name: string
  address: string
}

interface RawOldhamMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
}

interface RawOldhamShowtime {
  movieId: string
  movieTitle: string
  date: string
  time: string
  endTime: string
  eventUrl: string
}

class OldhamTransformer extends BaseTransformer {
  readonly chain = 'oldham'

  transformCinemas = makeTransformCinemas<RawOldhamCinema>({
    chain: 'oldham',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies(movies: unknown[]): StandardMovie[] {
    return (movies as RawOldhamMovie[]).map(m => ({
      id: `oldham:${m.id}`,
      filmTitle: m.title.replace(/\r|\n|\t/g, ' ').replace(/ +/g, ' ').trim(),
      language: m.language || 'Unknown',
      format: '',
      source: { chain: 'oldham', id: m.id, details: { genre: m.genre, synopsis: m.synopsis } },
    }))
  }

  transformShowtimes(rawShowtimes: unknown[]): StandardShowtime[] {
    const showtimes = rawShowtimes as RawOldhamShowtime[]
    const skipped = showtimes.filter(s => !s.date || !s.time).length
    if (skipped > 0)
      logger.warn(`[oldham] ${skipped} showtimes skipped: missing date or time`)

    return showtimes
      .filter(s => s.date && s.time)
      .map(s => ({
        id: `oldham:${s.movieId}-${s.date}-${s.time.replace(/[^0-9]/g, '')}`,
        filmId: `oldham:${s.movieId}`,
        cinemaId: 'oldham:oldham-theatre',
        unixTime: toSingaporeUnixMsFrom12h(s.date, s.time),
        link: s.eventUrl || 'https://asianfilmarchive.org/whatson/',
        ticketType: { label: '2D', type: '2D' },
        movieFormat: '2D',
        details: { showTime: s.time, date: s.date, endTime: s.endTime },
      }))
  }
}

const transformer = new OldhamTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
