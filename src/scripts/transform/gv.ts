import {
  StandardMovie,
  StandardCinema,
  StandardShowtime,
} from '@/types/standard'
import { removeMovieDetails, getEditDistance, cleanString } from '../../text'

interface GvRawCinema {
  id: string
  name: string
  sequence: string
  status: string
  statusMessage: string
  colorCode: string
  locationCode: string
  cinemaCode: string
  type: string
}

interface IncreasedCapacity {
  increasedCapacity: boolean
  promptMessage: string
}

interface GvRawShowtime {
  cinemaId: string
  filmCd: string
  filmTitle: string
  rating: string
  ratingImgUrl: string
  consumerAdvice: string
  priorityBkgFlg: boolean
  subTitles: string[]
  showDate: string
  time12: string
  time24: string
  soldPercent: number
  hall: string
  concessionAllow: boolean
  increasedCapacity: IncreasedCapacity
}

interface GvRawMovie {
  filmCd: string
  filmTitle: string
  imageLink: string
  language: string
  rating: string
  ratingImgUrl: string
  subTitles: string[]
  reviewRating: number
  formatCode: string
  formatGroupId: string
  formatGroupParent: boolean
  box: string
  brand: string
  location: string
  buyTicket: boolean
  exclusive: boolean
  mPassMovie: boolean
  frameDescription: string
  colorCode: string
  specialEvent: boolean
  priorityBkgFlg: boolean
  superSneaks: boolean
  duration: number
  consumerAdvise: string
  type: string
}

const locationType: Record<string, string> = {
  G: 'Gold Class',
  E: 'Deluxe Plus',
  L: 'Duo Deluxe',
  M: 'GVMax',
  C: 'Gemini',
  T: 'Standard',
  U: 'Auro 11.1',
  Cineleisure: 'Cineleisure',
}

interface ShawMappedCinema {
  id: string
  name: string
  searchableName: string
  source: {
    chain: string
    id: string
    details: {
      sequence: string
      locationCode: string
      cinemaCode: string
      type: {
        label: string
        type: string
      }
    }
  }
}

const findFormatParentId = (
  moviesArray: GvRawMovie[],
  formatGroupId: string,
) => {
  const formatGroupParentObject = moviesArray.find(
    movie => movie.formatGroupParent && movie.formatGroupId === formatGroupId,
  )
  if (!formatGroupParentObject?.filmCd)
    console.log(`formatGroupId ${formatGroupId} not found`)
  return formatGroupParentObject?.filmCd
}

interface MappedMovies {
  id: string
  filmTitle: string
  language: string
  format: string
  source: {
    chain: string
    id: string
    details: {
      subtitle: string[]
      formatGroupParentId: string
      freeValidity: boolean
      annualPassValidity: boolean
      eDealsValidity: boolean
      mPassMovie: boolean
    }
  }
}

// * Free tickets cannot be used.
// ^ Annual Pass cannot be used.
// + GV Good eDeals cannot be used.
const mapMovies = (moviesArray: GvRawMovie[]): MappedMovies[] => {
  const mappedMovies = moviesArray.map(movie => {
    const {
      filmCd,
      filmTitle,
      language,
      subTitles,
      // reviewRating,
      formatCode,
      formatGroupId,
      formatGroupParent,
      mPassMovie,
    } = movie
    // //imageLink, rating, ratingImgUrl, box, brand, location, buyTicket, exclusive, mPassMovie, frameDescription, colorCode, specialEvent, priorityBkgFlg, superSneaks, duration, consumerAdvise, type

    const promoValidity = filmTitle.substring(filmTitle.length - 5)
    const freeValidity = promoValidity.indexOf('*') === -1
    const annualPassValidity = promoValidity.indexOf('+') === -1
    const eDealsValidity = promoValidity.indexOf('^') === -1

    const cleanedFilmTitle = filmTitle
    // removeMovieDetails(filmTitle, raw => {
    //   let text = structuredClone(raw)
    //   text = text.replace('*', '')
    //   text = text.replace('+', '')
    //   text = text.replace('^', '')
    //   return text
    // })

    const formatGroupParentId = !formatGroupParent
      ? findFormatParentId(moviesArray, formatGroupId)
      : filmCd

    return {
      id: `gv:${filmCd}`,
      filmTitle: cleanedFilmTitle,
      language,
      format: formatCode,
      source: {
        chain: 'gv',
        id: filmCd,
        details: {
          subtitle: subTitles,
          formatGroupParentId,
          freeValidity,
          annualPassValidity,
          eDealsValidity,
          mPassMovie,
        },
      },
    }
  })
  return mappedMovies
}

function parseTo24Hour(time12: string) {
  const [full, hours, minutes, period] = time12.match(
    /(\d{1,2}):(\d{2})(AM|PM)/,
  )
  const hour = parseInt(hours)
  if (period === 'PM' && hour !== 12) {
    return `${hour + 12}${minutes}`
  } else if (period === 'AM' && hour === 12) {
    return `00${minutes}`
  } else {
    return `${hour}${minutes}`
  }
}

const mapShowtimes = (showtimeArray: TransformedShowtime[]) => {
  const mappedShowtimeArray = showtimeArray.flatMap(
    (showtime: TransformedShowtime): StandardShowtime[] => { // Add types here
      const {
        showDate,
        time24,
        time12,
        hall,
        cinemaId,
        filmCd,
        subTitles: subtitles,
        soldPercent,
        movie,
        cinema,
        priorityBkgFlg,
        concessionAllow,
      } = showtime

      if (!movie || !cinema) { // Ensure both movie and cinema objects exist
        return []
      }

      const unixTime = getUnixDate(showDate, time24, time12)
      if (!unixTime) {
        console.log(
          `Unix time calculation failed for GV: showDate ${showDate}, time24 ${time24}, time12 ${time12}`,
        )
        return [] // Skip if no valid unixTime
      }

      const id = `${cinemaId}/${filmCd}/${showDate}/${time24}/${hall}`
      const ticketType = cinema.source?.details?.type // Access safely
      const cinemaParent = cinema.source?.details?.locationCode
      const cinemaName = cinema.name
      const movieTitle = movie.filmTitle
      const movieFormat = movie.format
      const filmParent = movie.source.details.formatGroupParentId
      const { freeValidity, annualPassValidity, eDealsValidity, mPassMovie } =
        movie.source.details

      const showtimeObject: StandardShowtime = {
        id: `gv:${id}`,
        cinemaId: `gv:${cinemaParent}`,
        filmId: `gv:${filmParent}`, // Ensure this aligns with how StandardMovie IDs are created/used
        unixTime,
        link: `https://www.gv.com.sg/GVSeatSelection#/cinemaId/${cinemaId}/filmCode/${filmCd}/showDate/${showDate}/showTime/${time24}/hallNumber/${hall}`,
        ticketType,
        movieFormat,
        details: {
          priorityBooking: priorityBkgFlg,
          subtitles,
          soldPercent: `${soldPercent * 10}%`, // Assuming soldPercent is 0-10, if it's 0-100, then just soldPercent
          hall,
          cinemaName,
          movieTitle,
          discounts: {
            concessionAllow,
            freeValidity,
            annualPassValidity,
            eDealsValidity,
            mPassMovie,
          },
        },
      }
      return [showtimeObject] // Return as an array for flatMap
    },
  )
  return mappedShowtimeArray
}

function is24HourTime(time24: string) {
  const pattern = /^(2[0-3]|[01][0-9])[0-5][0-9]$/
  return pattern.test(time24)
}

const getUnixDate = (
  showDate: string,
  time24: string,
  time12: string,
): number => {
  if (!is24HourTime(time24)) time24 = parseTo24Hour(time12)
  const dateArray = showDate.split('-')
  const timeString =
    time24.substring(0, 2) + ':' + time24.substring(2, 4) + ':00'
  const dateTime = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${timeString}+08:00`
  const jsDate = new Date(dateTime)
  return jsDate.getTime()
}

type TransformedShowtime = GvRawShowtime & {
  cinema: ShawMappedCinema
  movie: MappedMovies
}

const transformShowtimes = (
  moviesArray: MappedMovies[],
  cinemaArray: ShawMappedCinema[],
  showtimeArray: GvRawShowtime[],
): TransformedShowtime[] => {
  const missingCinemaIds = new Set()
  const missingFilmCds = new Set()
  const transformedShowtimeArray = showtimeArray.map(showtime => {
    const { cinemaId, filmCd } = showtime

    const showtimeCinema = cinemaArray.find(
      item => item.id === `gv:${cinemaId}`,
    )

    const showtimeMovie = moviesArray.find(item => item.id === `gv:${filmCd}`)
    if (!showtimeCinema) missingCinemaIds.add(cinemaId)
    if (!showtimeMovie) missingFilmCds.add(filmCd)
    return {
      movie: showtimeMovie,
      cinema: showtimeCinema,
      ...showtime,
    }
  })

  if (missingCinemaIds.size > 0)
    console.log(`cinemaId ${Array.from(missingCinemaIds)} not found`)
  if (missingFilmCds.size > 0)
    console.log(`filmCd ${Array.from(missingFilmCds)} not found`)

  return transformedShowtimeArray
}

const mapCinemas = (cinemasArray: GvRawCinema[]): ShawMappedCinema[] => {
  const mappedCinemas = cinemasArray.map(cinema => {
    const { id, name, sequence, locationCode, cinemaCode, type } = cinema
    const cleanedCinemaName = cleanString(name)
    const isCineleisure = id === '18' && type === 'T'
    const cinemaLocationCode = findLocationCode(cinemasArray, cinema)
    const type_label = locationType[type] ? locationType[type] : type
    return {
      id: `gv:${id}`,
      name: cleanedCinemaName,
      searchableName: cleanedCinemaName,
      source: {
        chain: 'gv',
        id,
        details: {
          sequence,
          locationCode: cinemaLocationCode,
          cinemaCode, // what is this ?
          type: {
            label: type_label,
            type: isCineleisure ? 'Cineleisure' : type,
          },
        },
      },
    }
  })
  return mappedCinemas
}

const findLocationCode = (
  cinemasArray: GvRawCinema[],
  cinema: GvRawCinema,
): string => {
  const { id, name, locationCode, type } = cinema
  if (type === 'T') return locationCode
  if (String(locationCode) !== id) return locationCode
  const stripName = (text: string) => {
    let strippedText = structuredClone(text)
    strippedText = strippedText.replaceAll('Gold Class Express', '')
    strippedText = strippedText.replaceAll('Gold Class Grand', '')
    strippedText = strippedText.replaceAll('Gold Class', '')
    strippedText = strippedText.replaceAll('Deluxe Plus', '')
    strippedText = strippedText.replaceAll('Duo Deluxe', '')
    strippedText = strippedText.replaceAll('GV Grand', '')
    strippedText = strippedText.replaceAll('GVmax', '')
    strippedText = strippedText.replaceAll('GV', '')
    return strippedText
  }

  const strippedName = stripName(name)

  // getEditDistance
  for (const cinemasCandidate of cinemasArray) {
    const {
      id: candidateId,
      name: candidateName,
      type: candidateType,
      locationCode: candidateLocationCode,
    } = cinemasCandidate
    if (!(candidateType === 'T' && candidateLocationCode === candidateId))
      continue
    const candidateStrippedName = stripName(candidateName)
    const distance = getEditDistance(candidateStrippedName, strippedName)
    if (distance < 3) {
      return candidateId
    }
  }
  return locationCode
}

const cleanupCinemas = (cinemasArray: ShawMappedCinema[]): StandardCinema[] => {
  cinemasArray = cinemasArray.filter(cinema => {
    return cinema?.source?.details?.locationCode === cinema?.source?.id
  })
  return cinemasArray
}

const cleanupMovies = (moviesArray: MappedMovies[]): StandardMovie[] => {
  moviesArray = moviesArray.filter(movie => {
    return movie?.source?.details?.formatGroupParentId === movie?.source?.id
  })
  return moviesArray
}

const standardiseCinemaChain = (cinemaChainObject: {
  movies: GvRawMovie[]
  cinemas: GvRawCinema[]
  showtimes: GvRawShowtime[]
}): {
  movies: StandardMovie[]
  cinemas: StandardCinema[]
  showtimes: StandardShowtime[]
} => {
  const { movies, cinemas, showtimes } = cinemaChainObject

  const mappedCinemas: ShawMappedCinema[] = mapCinemas(cinemas)
  const mappedMovies: MappedMovies[] = mapMovies(movies)
  const transformedShowtimes = transformShowtimes(
    mappedMovies,
    mappedCinemas,
    showtimes,
  )
  const mappedShowtimes = mapShowtimes(transformedShowtimes)
  const cleanedupCinemas = cleanupCinemas(mappedCinemas)
  const cleanedupMovies = cleanupMovies(mappedMovies)

  return {
    movies: cleanedupMovies,
    cinemas: cleanedupCinemas,
    showtimes: mappedShowtimes,
  }
}

module.exports = {
  standardiseCinemaChain,
}
