export interface GVCinema {
  id: string
  name: string
  sequence: number
  status: number
  statusMessage: string | null
  colorCode: string | null
  locationCode: string
  cinemaCode: string | null
  type: string
}

export interface GVCinemaShowtime {
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
  increasedCapacity: {
    increasedCapacity: boolean
    promptMessage: string
  }
}

export interface RawCinemaShowtime {
  id: string
  movies: {
    filmCd: string
    filmTitle: string
    rating: string
    ratingImgUrl: string
    consumerAdvice: string
    priorityBkgFlg: boolean
    subTitles: string[]
    times: {
      showDate: string
      time12: string
      time24: string
      soldPercent: number
      hall: string
      concessionAllow: boolean
      increasedCapacity: {
        increasedCapacity: boolean
        promptMessage: string
      }
    }[]
  }[]
}

export interface GVMovies {
  filmCd: string
  filmTitle: string
  imageLink: string
  language: string
  rating: string // Other possible ratings inferred from context
  ratingImgUrl: string
  subTitles: string[]
  reviewRating: number
  formatCode: string // Allow for other formats like 3D/IMAX
  formatGroupId: number
  formatGroupParent: boolean
  box: string
  brand: string
  location: string // Numeric string based on sample
  buyTicket: boolean
  exclusive: boolean
  mPassMovie: boolean
  frameDescription: string
  colorCode: string
  specialEvent: boolean
  priorityBkgFlg: boolean
  superSneaks: boolean
  duration: number // Minutes
  consumerAdvise: string
  type: string // Could expand to union type if other types exist
}

interface GVApiResponse {
  success: boolean
  errorMessage: string | null
}

export interface CinemaShowtimeResponse extends GVApiResponse {
  data: { cinemas: RawCinemaShowtime[] }
}

export interface MovieResponse extends GVApiResponse {
  data: GVMovies[]
}

export interface CinemaResponse extends GVApiResponse {
  data: GVCinema[]
}
