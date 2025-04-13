interface CathayRawMovie {
  title: string
  format: string
  language: string
  genre: string[]
  duration: string
  parentalRating: string
  url: string
}

interface CathayRawCinema {
  id: string
  url: string
  cinemaName: string
  address: string
  nearestMRTStation: string
  gMapsLink: string
}

interface CathayRawShowtime {
  cinemaName: string
  dateFull: string // ISO 8601 date and time string
  hour: string // 24-hour clock hour
  dateOnly: string // ISO 8601 date string
  showTime: string // HH:MM time string
  title: string
  fullTitle: string
  link: string // URL
  pms: string // ( unclear what this field represents, consider adding a comment or renaming)
  filmId: string
  session_id: string
  sold_out: boolean // consider renaming to `isSoldOut` for clarity
  cinema_id: string
  subtitle: string
}

interface CathayMappedShowtime {
  id: string
  cinemaId: string
  filmId: string
  unixTime: number
  link: string
  ticketType: {
    type: string
    label: string
  }
  movieFormat: string
  details: {
    subtitles: string
    soldOut: boolean
    cinemaName: string
    movieTitle: string
    movieFullTitle: string
  }
}

interface CathayMappedCinema {
  id: string
  name: string
  location: string
  source: {
    chain: 'cathay'
    id: string
    details: {
      url: string
      address: string
      nearestMRTStation: string
      gMapsLink: string
    }
  }
}

interface CathayMappedMovie {
  id: string
  filmTitle: string
  language: string
  format: string
  source: {
    chain: string
    id: string
    details: {
      genre: string[]
      duration: string // or number, depending on the format
      parentalRating: string
      url: string
    }
  }
}

type CathayTransformedShowtime = CathayRawShowtime & {
  cinema: StandardCinema
  movie: StandardMovie
}

import {
  StandardMovie,
  StandardCinema,
  StandardShowtime,
} from '@/types/standard'
import { removeMovieDetails, cleanString } from '../../text'

const mapMovies = (moviesArray: CathayRawMovie[]): StandardMovie[] => {
  return moviesArray.map(movie => {
    let { title, format, language, genre, duration, parentalRating, url } =
      movie
    const id = movie.url.substring(movie.url.lastIndexOf('/') + 1)
    return {
      id: `cathay:${id}`,
      filmTitle: removeMovieDetails({ title }),
      language,
      format,
      source: {
        chain: 'cathay',
        id,
        details: {
          genre,
          duration,
          parentalRating,
          url,
        },
      },
    }
  })
}

const mapShowtimes = (
  showtimeArray: CathayTransformedShowtime[],
): CathayMappedShowtime[] => {
  return showtimeArray.map(showtime => {
    const {
      cinemaName,
      dateFull,
      title,
      fullTitle,
      link,
      pms,
      filmId,
      session_id,
      sold_out,
      cinema_id,
      subtitle,
      movie,
    } = showtime

    const { format } = movie
    let ticketType = {
      type: 'S',
      label: 'Standard',
    }
    if (pms === 'Y') {
      ticketType = {
        type: 'P',
        label: 'Premium Movie Suite',
      }
    } else if (format === 'Dolby Atmos') {
      ticketType = {
        type: 'D',
        label: 'Dolby Atmos',
      }
    }

    const showtimeJS = new Date(`${dateFull}+08:00`)
    const showtimeUnix = showtimeJS.getTime()
    return {
      id: `cathay:${session_id}`,
      cinemaId: `cathay:${cinema_id}`,
      filmId: `cathay:${filmId}`,
      unixTime: showtimeUnix,
      link,
      ticketType,
      movieFormat: format,
      details: {
        subtitles: subtitle,
        soldOut: sold_out,
        cinemaName,
        movieTitle: title,
        movieFullTitle: fullTitle,
      },
    }
  })
}

const cinemaNameClean = (cinemaName: string): string => {
  const chainName = 'CATHAY CINEPLEX'
  if (!cinemaName.includes(chainName)) return cinemaName
  const locationName = cinemaName.substring(chainName.length)
  const words = locationName.split(' ').map(word => {
    const firstChar = word.charAt(0)
    const capitalizedWord = firstChar + word.substring(1).toLowerCase()
    return capitalizedWord
  })
  return 'Cathay Cineplex ' + words.join(' ')
}

const mapCinemas = (cinemasArray: CathayRawCinema[]): StandardCinema[] => {
  return cinemasArray.map(cinema => {
    const { id, url, cinemaName, address, nearestMRTStation, gMapsLink } =
      cinema
    return {
      id: `cathay:${id}`,
      name: cleanString(cinemaName, cinemaNameClean),
      searchableName: cleanString(address),
      source: {
        chain: 'cathay',
        id,
        details: {
          url,
          address: cleanString(address),
          nearestMRTStation: cleanString(nearestMRTStation),
          gMapsLink,
        },
      },
    }
  })
}

const transformShowtimes = (
  moviesArray: StandardMovie[],
  cinemaArray: StandardCinema[],
  showtimeArray: CathayRawShowtime[],
): CathayTransformedShowtime[] => {
  const transformedShowtimes = showtimeArray.map(
    (showtime: CathayRawShowtime): CathayTransformedShowtime => {
      const { cinema_id, filmId } = showtime
      // let showtime: MappedShowtimes =
      const showtimeCinema = cinemaArray.find(
        item => item.id === `cathay:${cinema_id}`,
      )
      const showtimeMovie = moviesArray.find(
        item => item.id === `cathay:${filmId}`,
      )
      if (!showtimeMovie) console.log(`cinemaId ${cinema_id} not found`)
      if (!showtimeCinema) console.log(`filmCd ${filmId} not found`)

      return {
        cinema: showtimeCinema,
        movie: showtimeMovie,

        ...showtime,
      }
    },
  )
  return transformedShowtimes
}

const standardiseCinemaChain = (cinemaChainObject: {
  movies: CathayRawMovie[]
  cinemas: CathayRawCinema[]
  showtimes: CathayRawShowtime[]
}): {
  movies: StandardMovie[]
  cinemas: StandardCinema[]
  showtimes: StandardShowtime[]
} => {
  let { movies, cinemas, showtimes } = cinemaChainObject

  const mappedCinemas = mapCinemas(cinemas)
  const mappedMovies = mapMovies(movies)
  const transformedShowtimes = transformShowtimes(
    mappedMovies,
    mappedCinemas,
    showtimes,
  )
  const mappedShowtimes = mapShowtimes(transformedShowtimes)
  // cinemas = cleanupCinemas(cinemas);
  // movies = cleanupMovies(movies);

  return {
    movies: mappedMovies,
    cinemas: mappedCinemas,
    showtimes: mappedShowtimes,
  }
}

module.exports = {
  standardiseCinemaChain,
  // transformMovies,
  // transformShowtimes,
  // transformCinemas,
}
