/**
 * Showtime data types for the cinema scraper project
 */

export interface ShowtimeChainSpecific {
  movieTitle?: string
  hallName?: string
  hallType?: string
  url?: string
  [key: string]: any
}

export interface ShowtimeSource {
  chain: string
  id: string
  chainSpecific: ShowtimeChainSpecific
}

/**
 * Showtime interface aligned with StandardShowtime type
 */
export interface Showtime {
  id: string
  filmId: string
  cinemaId: string
  time?: string
  date?: string
  datetime?: Date
  unixTime?: number // From StandardShowtime
  link?: string // From StandardShowtime
  ticketType?: {
    label: string
    type: string
  } // From StandardShowtime
  movieFormat?: string // From StandardShowtime
  details?: any // From StandardShowtime
  source: ShowtimeSource
  createdAt?: Date
  updatedAt?: Date
}
