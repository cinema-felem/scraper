import { StandardCinema, StandardMovie, StandardShowtime } from '@/types/standard'
import { cleanString } from '../../text'

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
  id: number
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

const transformCinemas = (cinemas: RawEagleWingCinema[]): StandardCinema[] =>
  cinemas.map(({ id, name, address }) => ({
    id: `eaglewing:${id}`,
    name: cleanString(name),
    searchableName: cleanString(name),
    source: {
      chain: 'eaglewing',
      id,
      details: { address },
    },
  }))

const transformMovies = (movies: RawEagleWingMovie[]): StandardMovie[] =>
  movies.map(({ id, slug, title, language, genre }) => ({
    id: `eaglewing:${id}`,
    filmTitle: cleanString(title),
    language: language || 'Unknown',
    format: '',
    source: {
      chain: 'eaglewing',
      id: String(id),
      details: { genre, slug },
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
  // If no AM/PM, treat as 24h
  const iso = `${date}T${String(hours).padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00+08:00`
  return new Date(iso).getTime()
}

const transformShowtimes = (showtimes: RawEagleWingShowtime[]): StandardShowtime[] =>
  showtimes.flatMap(({ movieId, date, sessions }) =>
    sessions
      .filter(s => s.time)
      .map(s => ({
        id: `eaglewing:${s.id}`,
        filmId: `eaglewing:${movieId}`,
        cinemaId: 'eaglewing:1',
        unixTime: toUnixTime(s.date || date, s.time),
        link: s.bookingUrl || 'https://www.eaglewingscinematics.com.sg/',
        ticketType: { label: s.format || '2D', type: s.format || '2D' },
        movieFormat: s.format || '2D',
        details: { screen: s.hall, showTime: s.time, date: s.date || date },
      })),
  )

const standardiseCinemaChain = (raw: {
  movies: RawEagleWingMovie[]
  cinemas: RawEagleWingCinema[]
  showtimes: RawEagleWingShowtime[]
}) => ({
  movies: transformMovies(raw.movies),
  cinemas: transformCinemas(raw.cinemas),
  showtimes: transformShowtimes(raw.showtimes),
})

module.exports = { standardiseCinemaChain }
