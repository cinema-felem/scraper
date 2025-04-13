import {
  StandardCinema,
  StandardMovie,
  StandardShowtime,
} from '@/types/standard'
import { removeMovieDetails } from '../../text'

const PriceCardSym: Record<string, string> = {
  'Mon-Thurs after 6pm': 'T',
  'Mon-Fri Before 6pm': 'F',
  'FRI after 6pm/SAT/SUN': 'E',
  Special: 'S',
}

interface Theme {
  slug: string
  id: string
  title: string
}

interface Person {
  Id: string
  FirstName: string
  LastName: string
  Role: string
}

type MappedMovies = {
  id: string
  filmTitle: string
  language: string // ??
  format: string
  source: {
    chain: string
    id: string
    details: {
      url: string
      subtitle: string[]
      GovernmentFilmTitle?: string
      FilmPosterUrl: string
      FilmPosterThumbnailUrl: string
      BackdropImageUrl: string
      FilmTrailerUrl: string
      Attributes: void[]
      IsRestricted: boolean
      People: Person[]
      Id: string
      Title: string
      ShortName: string
      Synopsis: string
      Genre: string
      SignageText: string
      Distributor: string
      OpeningDate: string
      Rating: string
      Status: string
      Content: string
      Duration: number
      DisplaySequence: number
      NationalCode: string
      releasingSchedules: string[]
      eventTypes: string[]
      order: number
      coverImage: string
      description: string
      rating: string
      categories: string[]
      themes: Theme[]
    }
  }
}

interface MovieDetail {
  Id: string
  Title: string
  ShortName: string
  Synopsis: string
  Genre: string
  SignageText: string
  Distributor: string
  OpeningDate: string
  Rating: string
  Status: string
  Content: string
  Duration: number
  DisplaySequence: number
  NationalCode?: string
  Format: string
  IsRestricted: boolean
  People: Person[]
  AudioLanguage?: string
  GovernmentFilmTitle?: string
  FilmPosterUrl: string
  FilmPosterThumbnailUrl: string
  BackdropImageUrl: string
  FilmTrailerUrl?: string
  Attributes: void[]
}

interface ProjectorRawMovie {
  url: string
  categories: string[]
  themes: Theme[]
  veeziFilmId: string
  title: string
  description: string
  rating: string
  subtitles: string[]
  releasingSchedules: string[]
  eventTypes: string[]
  order: number
  coverImage: string
  movieDetail: MovieDetail
}

interface Screen {
  veeziScreenId: number
}

interface Venue {
  title: string
  screens?: Screen[]
  accessibility?: string[]
}

interface ProjectorRawCinema {
  venues: Venue[]
  veeziToken: string
  title: string
}

type ProjectorRawShowtime = {
  Url: string
  Id: number
  FilmId: string
  FilmPackageId?: string
  Title: string
  ScreenId: number
  Seating: string
  AreComplimentariesAllowed: boolean
  TicketsSoldOut: boolean
  FewTicketsLeft: boolean
  ShowType: string
  SalesVia: string[]
  Status: string
  PreShowStartTime: string // ISO 8601 date string
  SalesCutOffTime: string // ISO 8601 date string
  FeatureStartTime: string // ISO 8601 date string
  FeatureEndTime: string // ISO 8601 date string
  CleanupEndTime: string // ISO 8601 date string
  SeatsAvailable: number
  SeatsHeld: number
  SeatsHouse: number
  SeatsSold: number
  FilmFormat: string
  PriceCardName: string
  Attributes: void[]
  AudioLanguage?: string
}

const mapMovies = (input: ProjectorRawMovie[]): StandardMovie[] => {
  const filteredMovies = input.filter(movie => {
    return movie?.veeziFilmId
  })
  const mappedMovies = filteredMovies.map(movie => {
    const {
      url,
      categories,
      themes,
      veeziFilmId,
      title,
      description,
      rating,
      subtitles,
      releasingSchedules,
      eventTypes,
      order,
      coverImage,
      movieDetail,
    } = movie

    const {
      Id,
      Title,
      ShortName,
      Synopsis,
      Genre,
      SignageText,
      Distributor,
      OpeningDate,
      Rating,
      Status,
      Content,
      Duration,
      DisplaySequence,
      NationalCode,
      Format,
      IsRestricted,
      People,
      AudioLanguage,
      GovernmentFilmTitle,
      FilmPosterUrl,
      FilmPosterThumbnailUrl,
      BackdropImageUrl,
      FilmTrailerUrl,
      Attributes,
    } = movieDetail

    // let { veeziFilmId: id, url, title: title } = movie;
    return {
      id: `projector:${veeziFilmId}`,

      filmTitle: title, // removeMovieDetails(title),
      language: AudioLanguage ? AudioLanguage : 'Unknown', // ??
      format: Format,
      source: {
        chain: 'projector',
        id: veeziFilmId,
        details: {
          url,
          subtitle: subtitles,
          GovernmentFilmTitle,
          FilmPosterUrl,
          FilmPosterThumbnailUrl,
          BackdropImageUrl,
          FilmTrailerUrl,
          Attributes,
          IsRestricted,
          People,
          Id,
          Title,
          ShortName,
          Synopsis,
          Genre,

          SignageText,
          Distributor,
          OpeningDate,
          Rating,
          Status,
          Content,
          Duration,
          DisplaySequence,
          NationalCode,
          releasingSchedules,
          eventTypes,
          order,
          coverImage,
          description,
          rating,
          categories,
          themes,
        },
      },
    }
  })
  return mappedMovies
}

type TransformedShowtime = ProjectorRawShowtime & {
  cinema?: CinemaScreenDetails
  movie: MappedMovies
}

const transformShowtimes = (
  moviesArray: StandardMovie[],
  cinemaArray: StandardCinema[],
  showtimeArray: ProjectorRawShowtime[],
): TransformedShowtime[] => {
  const transformedShowtimes = showtimeArray.flatMap(showtime => {
    const { ScreenId, FilmId } = showtime
    const cinema = getCinemaScreenDetails(cinemaArray, ScreenId)
    const movie = moviesArray.find(item => item.id === `projector:${FilmId}`)
    if (!cinema) {
      console.log(`cinemaId ${ScreenId} not found`)
    }
    if (!movie) {
      console.log(`filmCd ${FilmId} not found`)
    }
    if (!cinema || !movie) {
      return []
    }
    return {
      cinema,
      movie,
      ...showtime,
    } //showtime.cinema && showtime.movie ? showtime : []
  })
  return transformedShowtimes
}

type CinemaScreenDetails = {
  veeziScreenId: number
  accessibility: string[]
  venueTitle: string
  cinemaTitle: string
  id: string
}

const getCinemaScreenDetails = (
  cinemaArray: StandardCinema[],
  veeziScreenId: number,
): CinemaScreenDetails | null => {
  for (const cinema of cinemaArray) {
    const { name: cinemaTitle, id } = cinema
    for (const venue of (cinema.source.details as ProjectorCinemaDetails)
      .venues) {
      const { title: venueTitle, accessibility } = venue
      for (const screen of venue.screens) {
        if (screen.veeziScreenId === veeziScreenId) {
          return {
            veeziScreenId,
            accessibility,
            venueTitle,
            cinemaTitle,
            id,
          }
        }
      }
    }
  }
}

type MappedShowtime = {
  id: string
  cinemaId: string
  filmId: string
  unixTime: number
  link: string
  ticketType: {
    label: string
    type: string
  }
  movieFormat: string
  details: {
    // movieTitle: string
    // subtitles: string[]
    discounts: {
      complimentary: boolean
    }
    FilmPackageId: string
    Title: string
    ScreenId: number
    Seating: string
    TicketsSoldOut: boolean
    FewTicketsLeft: boolean
    ShowType: string
    SalesVia: string[]
    Status: string
    PreShowStartTime: string
    FeatureStartTime: string
    FeatureEndTime: string
    CleanupEndTime: string
    SeatsAvailable: number
    SeatsHeld: number
    SeatsHouse: number
    SeatsSold: number
    Attributes: void[]
    AudioLanguage: string
    veeziScreenId: number
    accessibility: string[]
    venueTitle: string
    cinemaTitle: string
    filmId: string
    filmURL: string
    filmfilmTitle: string
    filmlanguage: string
    filmformat: string
    // filmGovernmentFilmTitle: string
    // filmFilmPosterUrl: string
    // filmFilmPosterThumbnailUrl: string
    // filmBackdropImageUrl: string
    // filmFilmTrailerUrl: string
    // filmAttributes: void[]
    // filmIsRestricted: boolean
    // filmPeople: Person[]

    // filmTitle: string
    // filmShortName: string
    // filmSynopsis: string
    // filmGenre: string
    // filmSignageText: string
    // filmDistributor: string
    // filmOpeningDate: string
    // filmRating: string
    // filmStatus: string
    // filmContent: string
    // filmDuration: number
    // filmDisplaySequence: number
    // filmNationalCode: string
    // filmreleasingSchedules: string[]
    // filmeventTypes: string[]
    // filmorder: number
    // filmcoverImage: string
    // filmdescription: string
    // filmrating: string
    // filmcategories: string[]
    // filmthemes: Theme[]
  }

  // id: `projector:${id}`,
  // cid: id,
  // filmId: `projector:${filmId}`,
  // cinemaId: `projector:${cinemaId}`,
  // unixTime,
  // link,
}

const mapShowtimes = (
  showtimeArray: TransformedShowtime[],
): StandardShowtime[] => {
  return showtimeArray.map(showtime => {
    const {
      Url,
      Id,
      FilmId,
      FilmPackageId,
      Title,
      ScreenId,
      Seating,
      AreComplimentariesAllowed,
      TicketsSoldOut,
      FewTicketsLeft,
      ShowType,
      SalesVia,
      Status,
      PreShowStartTime,
      SalesCutOffTime,
      FeatureStartTime,
      FeatureEndTime,
      CleanupEndTime,
      SeatsAvailable,
      SeatsHeld,
      SeatsHouse,
      SeatsSold,
      FilmFormat,
      PriceCardName,
      Attributes,
      AudioLanguage,
      cinema,
      movie,
    } = showtime

    const {
      veeziScreenId,
      accessibility,
      venueTitle,
      cinemaTitle,
      id: cinemaId,
    } = cinema

    const {
      id: filmId,

      filmTitle: filmfilmTitle,
      language: filmlanguage,
      format: filmformat,
      source: filmSource,
    } = movie

    const {
      url: filmURL,
      subtitle: filmsubtitle,
      GovernmentFilmTitle: filmGovernmentFilmTitle,
      FilmPosterUrl: filmFilmPosterUrl,
      FilmPosterThumbnailUrl: filmFilmPosterThumbnailUrl,
      BackdropImageUrl: filmBackdropImageUrl,
      FilmTrailerUrl: filmFilmTrailerUrl,
      Attributes: filmAttributes,
      IsRestricted: filmIsRestricted,
      People: filmPeople,
      // filmId: // filmId,
      Title: filmTitle,
      ShortName: filmShortName,
      Synopsis: filmSynopsis,
      Genre: filmGenre,
      SignageText: filmSignageText,
      Distributor: filmDistributor,
      OpeningDate: filmOpeningDate,
      Rating: filmRating,
      Status: filmStatus,
      Content: filmContent,
      Duration: filmDuration,
      DisplaySequence: filmDisplaySequence,
      NationalCode: filmNationalCode,
      releasingSchedules: filmreleasingSchedules,
      eventTypes: filmeventTypes,
      order: filmorder,
      coverImage: filmcoverImage,
      description: filmdescription,
      rating: filmrating,
      categories: filmcategories,
      themes: filmthemes,
    } = filmSource.details
    const unixTime = new Date(`${SalesCutOffTime}+08:00`).getTime()
    let ticketType = {
      label: 'Special',
      type: PriceCardSym['Special'],
    }
    if (PriceCardName) {
      if (PriceCardSym[PriceCardName]) {
        let cinemaSym = 'G'
        if (cinemaTitle === 'Cineleisure') {
          cinemaSym = 'C'
        }
        ticketType = {
          label: PriceCardName,
          type: `${PriceCardSym[PriceCardName]}${cinemaSym}`,
        }
      }
    }
    return {
      id: `projector:${Id}`,
      cinemaId,
      filmId,
      unixTime,
      link: Url,
      ticketType: {
        label: PriceCardName,
        type: PriceCardName,
      },
      movieFormat: FilmFormat,
      details: {
        // movieTitle: filmTitle,
        // subtitles: filmsubtitle,
        discounts: {
          complimentary: AreComplimentariesAllowed,
        },
        FilmPackageId,
        Title,
        ScreenId,
        Seating,
        TicketsSoldOut,
        FewTicketsLeft,
        ShowType,
        SalesVia,
        Status,
        PreShowStartTime,
        FeatureStartTime,
        FeatureEndTime,
        CleanupEndTime,
        SeatsAvailable,
        SeatsHeld,
        SeatsHouse,
        SeatsSold,
        Attributes,
        AudioLanguage,
        veeziScreenId,
        accessibility,
        venueTitle,
        cinemaTitle,
        filmId,
        filmURL,
        filmfilmTitle,
        filmlanguage,
        filmformat,

        // filmGovernmentFilmTitle,
        // filmFilmPosterUrl,
        // filmFilmPosterThumbnailUrl,
        // filmBackdropImageUrl,
        // filmFilmTrailerUrl,
        // filmAttributes,
        // filmIsRestricted,
        // filmPeople,
        // filmTitle,
        // filmShortName,
        // filmSynopsis,
        // filmGenre,
        // filmSignageText,
        // filmDistributor,
        // filmOpeningDate,
        // filmRating,
        // filmStatus,
        // filmContent,
        // filmDuration,
        // filmDisplaySequence,
        // filmNationalCode,
        // filmreleasingSchedules,
        // filmeventTypes,
        // filmorder,
        // filmcoverImage,
        // filmdescription,
        // filmrating,
        // filmcategories,
        // filmthemes,
      },

      // id: `projector:${id}`,
      // cid: id,
      // filmId: `projector:${filmId}`,
      // cinemaId: `projector:${cinemaId}`,
      // unixTime,
      // link,
    }
  })
}

// type MappedCinema = {
//   id: string
//   name: string
//   location: string
//   source: {
//     chain: string
//     id: string

//   }
// }

type ProjectorCinemaDetails = {
  venues: Venue[]
}
const mapCinemas = (input: ProjectorRawCinema[]): StandardCinema[] => {
  return input.map(cinema => {
    let { veeziToken: id, title, venues } = cinema
    venues = venues.filter(venue => {
      return venue?.screens && venue?.screens.length > 0
    })
    return {
      id: `projector:${id}`,
      name: `The Projector ${title}`,
      searchableName: title,
      source: {
        chain: 'projector',
        id,
        details: {
          venues,
        },
      },
    }
  })
}

const standardiseCinemaChain = (cinemaChainObject: {
  movies: ProjectorRawMovie[]
  cinemas: ProjectorRawCinema[]
  showtimes: ProjectorRawShowtime[]
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

  return {
    movies: mappedMovies,
    cinemas: mappedCinemas,
    showtimes: mappedShowtimes,
  }
}

module.exports = {
  standardiseCinemaChain,
}
