export interface EagleWingMovie {
  id: number
  slug: string
  title: string
  rating: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
  openingDate: string
}

export interface EagleWingSession {
  id: string
  date: string
  time: string
  hall: string
  format: string
  bookingUrl: string
}

export interface EagleWingShowtime {
  movieId: number
  movieSlug: string
  date: string
  sessions: EagleWingSession[]
}
