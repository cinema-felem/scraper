import {
  StandardCinema,
  StandardMovie,
  StandardShowtime,
} from '@/types/standard'

import { toSingaporeUnixMs } from '../../utils/time'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanString } = require('../../text')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: logger } = require('../../utils/logger')

const formatType: Record<string, string> = {
  DGSD: 'Digital',
  IMSD: 'IMAX',
}

const ticketTypeDict: Record<string, string> = {
  DGTL: 'Digital',
  LUMR: 'Lumiere',
  PREM: 'premiere',
  DREM: 'Dreamers',
  DREMB: 'Dreamers Balestier',
  IMAX: 'IMAX',
}

const formatCodeDict: Record<string, string> = {
  DGSD: 'Digital',
  IMLS: 'IMAX',
  IMSD: 'IMAX Waterway Point',
}

const subtitleCodeDict: Record<string, string[]> = {
  ECSB: ['English', 'Chinese'],
  ENSB: ['English'],
  CHSB: ['Chinese'],
  NOSB: [],
}

const brandCodeDict: Record<string, string> = {
  DGTL: 'DGTL',
  IMAX: 'IMAX',
}

const restrictions: Record<string, string> = {
  SNF: 'Strictly No Free Tickets',
  NF: 'No Free Tickets',
  NR: 'No Restriction',
}

interface ShawRawMovie {
  synopsisShort?: string
  releaseDate: string
  isLimited: boolean
  isNewRelease: boolean
  isExclusive: boolean
  isSneakPreview: boolean
  isAdvanceSales: boolean
  movieReleaseId: number
  duration: number
  posterUrl: string
  primaryTitle: string
  formatCode?: string
  classifyCode?: string
  adviceName?: string
  code?: string
}

interface ShawRawCinema {
  id: number
  code: string
  name: string
  brands: number
  address: string
  poster: string
}

interface ShawRawShowtime {
  movieId: number
  movieReleaseId: number
  primaryTitle: string
  posterUrl: string
  duration: number
  classifyCode: string
  restrictionCode: string
  movieBrand: string
  performanceId: number
  displayDate: string
  displayTime: string
  locationId: number
  locationVenueId: number
  locationVenueName: string
  seatingStatus: string
  isMidnight: boolean
  locationVenueBrandCode: string
  formatCode: string
  subtitleCode: string
  brandCode: string
  isDtsx: boolean
}

const transformMovies = (moviesArray: ShawRawMovie[]): StandardMovie[] => {
  return moviesArray.map(movie => {
    let {
      movieReleaseId,
      primaryTitle,
      formatCode,
      isLimited,
      isNewRelease,
      isExclusive,
      isSneakPreview,
      isAdvanceSales,
    } = movie

    const language = 'Unknown'

    return {
      id: `shaw:${movieReleaseId}`,
      filmTitle: primaryTitle,
      language,
      format: formatCode ? formatType[formatCode] : 'Digital',
      source: {
        chain: 'shaw',
        id: String(movieReleaseId),
        details: {
          isLimited,
          isNewRelease,
          isExclusive,
          isSneakPreview,
          isAdvanceSales,
        },
      },
    }
  })
}

const transformShowtimes = (
  showtimeArray: ShawRawShowtime[],
): StandardShowtime[] => {
  const finalShowtimesArray: StandardShowtime[] = []
  showtimeArray.map(movieShowtime => {
    let {
      // movieId,
      movieReleaseId,
      primaryTitle,
      // posterUrl,
      // duration,
      // classifyCode,
      restrictionCode,
      movieBrand,
      performanceId,
      displayDate,
      displayTime,
      locationId,
      // locationVenueId,
      locationVenueName,
      seatingStatus,
      isMidnight,
      locationVenueBrandCode,
      formatCode,
      subtitleCode,
      // brandCode,
      isDtsx,
    } = movieShowtime

    const unixTime = getUnixTimestamp(displayDate, displayTime)

    let ticketTypeLabel = ticketTypeDict[locationVenueBrandCode]

    if (locationVenueBrandCode === 'IMAX') {
      locationVenueBrandCode = formatCode
      ticketTypeLabel = formatCodeDict[formatCode]
    }

    finalShowtimesArray.push({
      id: `shaw:${performanceId}`,
      filmId: `shaw:${movieReleaseId}`,
      cinemaId: `shaw:${locationId}`,
      unixTime,
      link: `https://shaw.sg/seat-selection/${performanceId}`,
      ticketType: {
        label: ticketTypeLabel,
        type: locationVenueBrandCode,
      },
      movieFormat: brandCodeDict[movieBrand],
      details: {
        subtitles: subtitleCodeDict[subtitleCode],
        seatingStatus,
        isMidnight,
        cinemaName: locationVenueName,
        movieTitle: primaryTitle,
        isDtsx,
        discounts: {
          restrictionCode,
          restrictions: restrictions[restrictionCode],
        },
      },
      // });
    })
  })
  return finalShowtimesArray
}

type MappedShowtime = {
  id: string
  filmId: string
  cinemaId: string
  unixTime: number
  link: string
  ticketType: {
    label: string
    type: string
  }
  movieFormat: string
  chainSpecific: {
    subtitles: string[]
    seatingStatus: string
    isMidnight: boolean
    cinemaName: string
    movieTitle: string
    isDtsx: boolean
    discounts: {
      restrictionCode: string
      restrictions: string
    }
  }
}

const getUnixTimestamp = (dateString: string, timeString: string): number => {
  // Normalize time input (handles "HH:MM AM/PM" or "HH:MM")
  const [normalizedTime, period] = timeString.toUpperCase().split(/ (?=AM|PM)/i)

  const [hoursStr, minutes] = normalizedTime
    .padStart(5, '0')
    .split(':')

  let hours = parseInt(hoursStr, 10)
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  // dateString is already YYYY-MM-DD
  return toSingaporeUnixMs(dateString, `${String(hours).padStart(2, '0')}:${minutes}`)
}

type ShawMappedCinema = {
  id: string
  name: string
  location: string
  source: {
    chain: string
    id: number
    chainSpecific: {
      address: string
      code: string
    }
  }
}

const transformCinemas = (cinemasArray: ShawRawCinema[]): StandardCinema[] => {
  return cinemasArray.map(cinema => {
    let { id, name, address, code } = cinema
    name = cleanString(name)
    address = cleanString(address)
    return {
      id: `shaw:${id}`,
      name,
      searchableName: address,
      source: {
        chain: 'shaw',
        id: String(id),
        details: {
          address,
          code,
        },
      },
    }
  })
}

const mergeMovieIds = (
  showtimeArray: StandardShowtime[],
  movieArray: StandardMovie[],
): StandardShowtime[] => {
  const movieSet: Record<string, string> = {}
  movieArray.forEach(movie => {
    movieSet[movie.filmTitle] = movie.id
  })
  const missingFilmId = new Set()
  const filteredShowtimeArray = showtimeArray.flatMap(
    (showtime: StandardShowtime): StandardShowtime | [] => {
      const { filmId, details } = showtime
      const isParent = movieSet[details.movieTitle] === filmId
      showtime.filmId = isParent ? filmId : movieSet[details.movieTitle]
      if (!showtime.filmId) {
        missingFilmId.add(filmId)
        return []
      }
      return showtime
    },
  )
  logger.warn('Missing film IDs', { filmIds: [...missingFilmId] })
  return filteredShowtimeArray
}

const standardiseCinemaChain = (cinemaChainObject: {
  movies: ShawRawMovie[]
  cinemas: ShawRawCinema[]
  showtimes: ShawRawShowtime[]
}): {
  movies: StandardMovie[]
  cinemas: StandardCinema[]
  showtimes: StandardShowtime[]
} => {
  let { movies, cinemas, showtimes } = cinemaChainObject

  const mappedCinema = transformCinemas(cinemas)
  const mappedMovies = transformMovies(movies)
  const mappedShowtimes = transformShowtimes(showtimes)
  const cleanShowtimeMovieIds = mergeMovieIds(mappedShowtimes, mappedMovies)
  return {
    movies: mappedMovies,
    cinemas: mappedCinema,
    showtimes: cleanShowtimeMovieIds,
  }
}

export { standardiseCinemaChain }
