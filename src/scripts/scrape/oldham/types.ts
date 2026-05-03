export interface OldhamCinema {
  id: string
  name: string
  address: string
}

export interface OldhamMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
}

export interface OldhamShowtime {
  movieId: string
  movieTitle: string
  date: string
  time: string
  endTime: string
  eventUrl: string
}
