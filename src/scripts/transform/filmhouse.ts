import { StandardCinema, StandardMovie, StandardShowtime } from '@/types/standard'
import { cleanString } from '../../text'

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

const transformCinemas = (cinemas: RawFilmhouseCinema[]): StandardCinema[] =>
  cinemas.map(({ id, name, address }) => ({
    id: `filmhouse:${id}`,
    name: cleanString(name),
    searchableName: cleanString(name),
    source: {
      chain: 'filmhouse',
      id,
      details: { address },
    },
  }))

const transformMovies = (movies: RawFilmhouseMovie[]): StandardMovie[] =>
  movies.map(({ id, title, language, genre }) => ({
    id: `filmhouse:${id}`,
    filmTitle: cleanString(title),
    language: language || 'Unknown',
    format: '',
    source: {
      chain: 'filmhouse',
      id,
      details: { genre },
    },
  }))

const parseFormat = (attributes: string[]): string => {
  if (!attributes || attributes.length === 0) return '2D'
  const joined = attributes.join(' ').toUpperCase()
  if (joined.includes('4DX')) return '4DX'
  if (joined.includes('IMAX')) return 'IMAX'
  if (joined.includes('3D')) return '3D'
  if (joined.includes('DOLBY')) return 'Dolby'
  return attributes[0] || '2D'
}

const transformShowtimes = (
  sessions: RawFilmhouseSession[],
): StandardShowtime[] =>
  sessions
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
        details: {
          screen: s.screenName,
          showTime: s.startTime,
          screenId: s.screenId,
        },
      }
    })

const standardiseCinemaChain = (raw: {
  movies: RawFilmhouseMovie[]
  cinemas: RawFilmhouseCinema[]
  showtimes: RawFilmhouseSession[]
}) => ({
  movies: transformMovies(raw.movies),
  cinemas: transformCinemas(raw.cinemas),
  showtimes: transformShowtimes(raw.showtimes),
})

module.exports = { standardiseCinemaChain }
