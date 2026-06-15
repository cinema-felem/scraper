import { StandardShowtime } from '../../types/standard'
import { toSingaporeUnixMsFrom12h } from '../../utils/time'
import { makeTransformCinemas, makeTransformMovies } from './factory'
import { BaseTransformer } from './base'
import logger from '../../utils/logger'

interface RawCarnivalCinema {
  id: string
  name: string
  address: string
}

interface RawCarnivalMovie {
  code: string
  name: string
  censor: string
  language: string
  duration: number
  genre: string
  openingDate: string
}

interface RawCarnivalSession {
  showId: string
  showTime: string
  format: string
  screen: string
  bookingLink: string
}

interface RawCarnivalCinemaGroup {
  cinemaName: string
  cinemaAddress: string
  sessions: RawCarnivalSession[]
}

interface RawCarnivalShowtime {
  movieCode: string
  date: string
  groups: RawCarnivalCinemaGroup[]
}

const CINEMA_NAME_TO_ID: Record<string, string> = {
  'golden mile': 'carnival:golden-mile-tower',
  'shaw tower': 'carnival:shaw-tower',
  'punggol': 'carnival:punggol',
  'mackenzie': 'carnival:rex-mackenzie',
}

const resolveCinemaId = (cinemaName: string): string => {
  const lower = cinemaName.toLowerCase()
  for (const [key, id] of Object.entries(CINEMA_NAME_TO_ID)) {
    if (lower.includes(key)) return id
  }
  return 'carnival:golden-mile-tower'
}

const normalizeShowTime = (showTime: string): string => {
  const match = showTime.trim().match(/^(\d{1,2}:\d{2})\s*([AP]M)/i)
  return match ? `${match[1]} ${match[2].toUpperCase()}` : showTime
}

class CarnivalTransformer extends BaseTransformer {
  readonly chain = 'carnival'

  transformCinemas = makeTransformCinemas<RawCarnivalCinema>({
    chain: 'carnival',
    getId: c => c.id,
    getName: c => c.name,
    getDetails: c => ({ address: c.address }),
  })

  transformMovies = makeTransformMovies<RawCarnivalMovie>({
    chain: 'carnival',
    getId: m => m.code,
    getTitle: m => m.name,
    getLanguage: m => m.language,
    getDetails: m => ({ genre: m.genre }),
  })

  transformShowtimes(rawShowtimes: unknown[]): StandardShowtime[] {
    const showtimes = rawShowtimes as RawCarnivalShowtime[]
    const allSessions = showtimes.flatMap(st => st.groups.flatMap(g => g.sessions))
    const skippedCount = allSessions.filter(s => !s.showTime).length
    if (skippedCount > 0)
      logger.warn(`[carnival] ${skippedCount} sessions skipped: missing showTime`)

    return showtimes.flatMap(({ movieCode, date, groups }) =>
      groups.flatMap(({ cinemaName, sessions }) => {
        const cinemaId = resolveCinemaId(cinemaName)
        return sessions
          .filter(s => s.showTime)
          .map(s => {
            const normalizedShowTime = normalizeShowTime(s.showTime)
            return {
              id: `carnival:${s.showId}`,
              filmId: `carnival:${movieCode}`,
              cinemaId,
              unixTime: toSingaporeUnixMsFrom12h(date, normalizedShowTime),
              link: s.bookingLink || 'https://carnivalcinemas.sg/',
              ticketType: { label: s.format || '2D', type: s.format || '2D' },
              movieFormat: s.format || '2D',
              details: { screen: s.screen, showTime: s.showTime, normalizedShowTime, date },
            }
          })
      }),
    )
  }
}

const transformer = new CarnivalTransformer()
export const standardiseCinemaChain = transformer.standardiseCinemaChain.bind(transformer)
