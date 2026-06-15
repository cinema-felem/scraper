import {
  StandardCinema,
  StandardMovie,
  StandardShowtime,
} from '@/types/standard'

import { toSingaporeUnixMsFrom12h } from '../../utils/time'
import { cleanString } from '../../text'
import logger from '../../utils/logger'

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
    const {
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
    const {
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
      formatCode,
      subtitleCode,
      // brandCode,
      isDtsx,
    } = movieShowtime
    let locationVenueBrandCode = movieShowtime.locationVenueBrandCode

    const unixTime = toSingaporeUnixMsFrom12h(displayDate, displayTime)

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

const transformCinemas = (cinemasArray: ShawRawCinema[]): StandardCinema[] => {
  return cinemasArray.map(cinema => {
    const { id, code } = cinema
    const name = cleanString(cinema.name)
    const address = cleanString(cinema.address)
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
      const movieTitle = details.movieTitle as string
      const isParent = movieSet[movieTitle] === filmId
      showtime.filmId = isParent ? filmId : movieSet[movieTitle]
      if (!showtime.filmId) {
        missingFilmId.add(filmId)
        return []
      }
      return showtime
    },
  )
  const droppedCount = showtimeArray.length - filteredShowtimeArray.length
  if (missingFilmId.size > 0)
    logger.warn(`[shaw] ${missingFilmId.size} filmIds unresolvable; ${droppedCount} showtimes dropped`, { filmIds: [...missingFilmId] })
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
  const { movies, cinemas, showtimes } = cinemaChainObject

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
