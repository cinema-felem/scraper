import { StandardCinema, StandardMovie, StandardShowtime } from '@/types/standard'
import { cleanString } from '../../text'

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

const transformCinemas = (cinemas: RawSFSCinema[]): StandardCinema[] =>
  cinemas.map(({ id, name, address }) => ({
    id: `sfs:${id}`,
    name: cleanString(name),
    searchableName: cleanString(name),
    source: {
      chain: 'sfs',
      id,
      details: { address },
    },
  }))

const transformMovies = (movies: RawSFSMovie[]): StandardMovie[] =>
  movies.map(({ id, title, language, genre }) => ({
    id: `sfs:${id}`,
    filmTitle: cleanString(title),
    language: language || 'Unknown',
    format: '',
    source: {
      chain: 'sfs',
      id,
      details: { genre },
    },
  }))

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

const toUnixTime = (date: string, time: string): number => {
  if (!date || !time) return 0

  // Handle ISO datetime strings (from JSON-LD)
  if (date.includes('T') || date.includes('+')) {
    return new Date(date).getTime()
  }

  // Handle "12 Jan 2025" text dates
  const textDateMatch = date.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0')
    const month = MONTHS[textDateMatch[2].toLowerCase().slice(0, 3)]
    if (month) {
      date = `${textDateMatch[3]}-${month}-${day}`
    }
  }

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

const transformShowtimes = (showtimes: RawSFSShowtime[]): StandardShowtime[] =>
  showtimes
    .filter(s => s.date && s.time)
    .map(s => ({
      id: `sfs:${s.movieId}-${s.date}-${s.time.replace(/[^0-9]/g, '')}`,
      filmId: `sfs:${s.movieId}`,
      cinemaId: 'sfs:1',
      unixTime: toUnixTime(s.date, s.time),
      link: s.peatixUrl || 'https://www.sfs-somerset.com/',
      ticketType: { label: '2D', type: '2D' },
      movieFormat: '2D',
      details: { showTime: s.time, date: s.date, endTime: s.endTime },
    }))

const standardiseCinemaChain = (raw: {
  movies: RawSFSMovie[]
  cinemas: RawSFSCinema[]
  showtimes: RawSFSShowtime[]
}) => ({
  movies: transformMovies(raw.movies),
  cinemas: transformCinemas(raw.cinemas),
  showtimes: transformShowtimes(raw.showtimes),
})

module.exports = { standardiseCinemaChain }
