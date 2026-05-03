export interface FilmhouseMovie {
  id: string
  title: string
  rating: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
  trailerUrl: string
  openingDate: string
}

export interface FilmhouseScreen {
  id: string
  name: string
}

export interface FilmhouseSession {
  id: string
  filmId: string
  screenId: string
  screenName: string
  startTime: string
  attributes: string[]
  bookingUrl: string
}
