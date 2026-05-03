export interface CapitolCinema {
  id: string
  name: string
  address: string
}

export interface CapitolMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
  sisticCode: string
  startDate: string
  endDate: string
}

export interface CapitolShowtime {
  movieId: string
  movieTitle: string
  date: string
  sisticCode: string
  sisticUrl: string
}
