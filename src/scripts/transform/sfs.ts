import { StandardShowtime } from '@/types/standard'
import { toSingaporeUnixMsFromText } from '@/utils/time'
import { makeTransformCinemas, makeTransformMovies } from './factory'
import { BaseTransformer } from './base'
import logger from '@/utils/logger'

interface RawSFSCinema {
  id: string
  name: string
  address: string
}

interface RawSFSMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
}

interface RawSFSShowtime {
  movieId: string
  movieTitle: string
  date: string
  time: string
  endTime: string
  peatixUrl: string
}

class SFSTransformer extends BaseTransformer {
  readonly chain = 'sfs'

  transformCinemas = makeTransformCinemas<RawSFSCinema>({
    chain: 'sfs',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies = makeTransformMovies<RawSFSMovie>({
    chain: 'sfs',
    getId: m => m.id,
    getTitle: m => m.title,
    getLanguage: m => m.language,
    getDetails: m => ({ genre: m.genre }),
  })

  transformShowtimes(rawShowtimes: unknown[]): StandardShowtime[] {
    const showtimes = rawShowtimes as RawSFSShowtime[]
    const skippedCount = showtimes.filter(s => !s.date || !s.time).length
    if (skippedCount > 0)
      logger.warn(`[sfs] ${skippedCount} showtimes skipped: missing date or time`)

    return showtimes
      .filter(s => s.date && s.time)
      .map(s => ({
        id: `sfs:${s.movieId}-${s.date}-${s.time.replace(/[^0-9]/g, '')}`,
        filmId: `sfs:${s.movieId}`,
        cinemaId: 'sfs:1',
        unixTime: toSingaporeUnixMsFromText(s.date, s.time),
        link: s.peatixUrl || 'https://www.sfs-somerset.com/',
        ticketType: { label: '2D', type: '2D' },
        movieFormat: '2D',
        details: { showTime: s.time, date: s.date, endTime: s.endTime },
      }))
  }
}

const transformer = new SFSTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
