import {
  StandardCinema,
  StandardMovie,
  StandardShowtime,
} from '@/types/standard'

const { removeMovieDetails, cleanString } = require('../../text')

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

    let language = 'Unknown'

    // language = primaryTitle.indexOf('(Mand)') === -1 ? language : 'Mandarin'
    // language = primaryTitle.indexOf('(T)') === -1 ? language : 'Thai'
    // language = primaryTitle.indexOf('(JPN)') === -1 ? language : 'Japanese'
    // language = primaryTitle.indexOf('(Malay)') === -1 ? language : 'Malay'
    // language = primaryTitle.indexOf('(M)') === -1 ? language : 'Mandarin'
    // language = primaryTitle.indexOf('(KOR)') === -1 ? language : 'Korean'
    // language = primaryTitle.indexOf('(CHN)') === -1 ? language : 'Chinese'

    // primaryTitle = removeMovieDetails(primaryTitle, (raw: string) => {
    //   let text = structuredClone(raw)
    //   text = text.replace('(Mand)', '')
    //   text = text.replace('(T)', '')
    //   text = text.replace('(JPN)', '')
    //   text = text.replace('(Malay)', '')
    //   text = text.replace('(M)', '')
    //   text = text.replace('(KOR)', '')
    //   text = text.replace('(CHN)', '')
    //   return text
    // })
    return {
      id: `shaw:${movieReleaseId}`,
      filmTitle: primaryTitle,
      language,
      format: formatType[formatCode],
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

// type ShawMappedMovie = {
//   id: string
//   filmTitle: string
//   language: string
//   format: string
//   source: {
//     chain: string
//     id: number
//     chainSpecific: {
//       isLimited: boolean
//       isNewRelease: boolean
//       isExclusive: boolean
//       isSneakPreview: boolean
//       isAdvanceSales: boolean
//     }
//   }
// }

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
  const TIMEZONE_OFFSET = '+08:00' // Singapore timezone

  // Normalize time input
  const [normalizedTime, period] = timeString.toUpperCase().split(/ (?=AM|PM)/i)

  // Convert to 24-hour format
  const [hoursStr, minutes] = normalizedTime
    .padStart(5, '0') // Ensure 4-digit format (HH:MM)
    .split(':')

  let hours = parseInt(hoursStr, 10)
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  // Construct ISO date string with timezone
  const isoString = `${dateString}T${String(hours).padStart(2, '0')}:${minutes}:00${TIMEZONE_OFFSET}`

  // Validate and return timestamp
  const date = new Date(isoString)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date/time input')
  }

  return date.getTime()
}

const getUnixDate = (displayDate: string, displayTime: string) => {
  const isPM = displayTime.includes('PM')
  if (isPM) {
    displayTime = displayTime.replace('PM', '')
    let hh = Number(displayTime.substring(0, 2))
    if (hh !== 12) hh = hh + 12
    displayTime = String(hh).padStart(2, '0') + displayTime.substring(2)
  } else {
    displayTime = displayTime.replace('AM', '')
    let hh = Number(displayTime.substring(0, 2))
    if (hh === 12) displayTime = '00' + displayTime.substring(2)
  }
  displayTime = displayTime.trim()
  const jsDate = new Date(`${displayDate}T${displayTime}:00+08:00`)
  return jsDate.getTime()
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
  console.log(missingFilmId)
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

module.exports = {
  // transformMovies,
  // transformShowtimes,
  // transformCinemas,
  standardiseCinemaChain,
}
