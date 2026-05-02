import { StandardCinema, StandardMovie, StandardShowtime } from '@/types/standard'
import { cleanString } from '../../text'

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
}

const resolveCinemaId = (cinemaName: string): string => {
  const lower = cinemaName.toLowerCase()
  for (const [key, id] of Object.entries(CINEMA_NAME_TO_ID)) {
    if (lower.includes(key)) return id
  }
  return 'carnival:golden-mile-tower'
}

const transformCinemas = (cinemas: RawCarnivalCinema[]): StandardCinema[] =>
  cinemas.map(({ id, name, address }) => ({
    id: `carnival:${id}`,
    name: cleanString(name),
    searchableName: cleanString(name),
    source: {
      chain: 'carnival',
      id,
      details: { address },
    },
  }))

const transformMovies = (movies: RawCarnivalMovie[]): StandardMovie[] =>
  movies.map(({ code, name, language, genre }) => ({
    id: `carnival:${code}`,
    filmTitle: cleanString(name),
    language: language || 'Unknown',
    format: '',
    source: {
      chain: 'carnival',
      id: code,
      details: { genre },
    },
  }))

const toUnixTime = (date: string, time: string): number => {
  const upper = time.toUpperCase().trim()
  const period = upper.endsWith('AM') ? 'AM' : upper.endsWith('PM') ? 'PM' : null
  const timePart = period ? upper.slice(0, -2).trim() : upper
  const [h, m] = timePart.split(':')
  let hours = parseInt(h, 10)
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  const iso = `${date}T${String(hours).padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00+08:00`
  return new Date(iso).getTime()
}

const transformShowtimes = (showtimes: RawCarnivalShowtime[]): StandardShowtime[] =>
  showtimes.flatMap(({ movieCode, date, groups }) =>
    groups.flatMap(({ cinemaName, sessions }) => {
      const cinemaId = resolveCinemaId(cinemaName)
      return sessions
        .filter(s => s.showTime)
        .map(s => ({
          id: `carnival:${s.showId}`,
          filmId: `carnival:${movieCode}`,
          cinemaId,
          unixTime: toUnixTime(date, s.showTime),
          link: s.bookingLink || 'https://carnivalcinemas.sg/',
          ticketType: { label: s.format || '2D', type: s.format || '2D' },
          movieFormat: s.format || '2D',
          details: { screen: s.screen, showTime: s.showTime, date },
        }))
    }),
  )

const standardiseCinemaChain = (raw: {
  movies: RawCarnivalMovie[]
  cinemas: RawCarnivalCinema[]
  showtimes: RawCarnivalShowtime[]
}) => ({
  movies: transformMovies(raw.movies),
  cinemas: transformCinemas(raw.cinemas),
  showtimes: transformShowtimes(raw.showtimes),
})

module.exports = { standardiseCinemaChain }
