export type StandardMovie = {
  id: string
  filmTitle: string
  language: string
  format: string
  // url: string // projector ???
  // chainSpecific: unknown // ??? shaw
  source: {
    chain: string
    id: string
    details: unknown
  }
}

export type StandardCinema = {
  id: string
  name: string
  searchableName: string
  source: {
    chain: string
    id: string
    details: unknown
  }
}

export type StandardShowtime = {
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
  details: any
}

export interface MergedMovie extends Partial<StandardMovie> {
  titleVariations: string[]
  movieIds: string[]
}
