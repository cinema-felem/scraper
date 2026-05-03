export interface AFCinema {
  id: string
  name: string
  address: string
}

export interface AFMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
}

export interface AFShowtime {
  movieId: string
  movieTitle: string
  date: string
  time: string
  endTime: string
  eventUrl: string
}
