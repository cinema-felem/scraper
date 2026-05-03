export interface CarnivalMovie {
  code: string
  name: string
  censor: string
  language: string
  duration: number
  genre: string
  description: string
  openingDate: string
  imageURL: string
  actor: string
  director: string
  YouTubeURL: string
}

export interface CarnivalCinema {
  id: string
  name: string
  address: string
}

export interface CarnivalShowtimeSession {
  showId: string
  showTime: string
  format: string
  screen: string
  bookingLink: string
}

export interface CarnivalCinemaGroup {
  cinemaName: string
  cinemaAddress: string
  sessions: CarnivalShowtimeSession[]
}

export interface CarnivalShowtime {
  movieCode: string
  date: string
  groups: CarnivalCinemaGroup[]
}
