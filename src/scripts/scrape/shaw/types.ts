export interface Cinema {
  id: number
  code: string
  name: string
  brands: number
  address: string
  poster: string
}

export interface Movie {
  synopsisShort: string
  releaseDate: Date
  isLimited: boolean
  isNewRelease: boolean
  isExclusive: boolean
  isSneakPreview: boolean
  isAdvanceSales: boolean
  movieReleaseId: number
  duration: number
  posterUrl: string
  primaryTitle: string
  formatCode: string
  classifyCode: string
  adviceName: string
  code: string | null
}

export interface MovieShowtime extends ShowTime {
  movieId: number
  movieReleaseId: number
  primaryTitle: string
  posterUrl: string
  duration: number
  classifyCode: string
  restrictionCode: string
  movieBrand: string
}

export interface MovieShowtimeRaw {
  movieId: number
  movieReleaseId: number
  primaryTitle: string
  posterUrl: string
  duration: number
  classifyCode: string
  restrictionCode: string
  movieBrand: string
  showTimes: ShowTime[]
}

export interface ShowTime {
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
  movieReleaseId: number
  posterUrl: string
  duration: number
  restrictionCode: string
  brandCode: string
  classifyCode: string
  primaryTitle: string
  isDtsx: boolean
}
