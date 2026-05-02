export interface SFSMovie {
  id: string
  title: string
  language: string
  genre: string
  duration: number
  synopsis: string
  posterUrl: string
  peatixEventUrl: string
}

export interface SFSShowtime {
  movieId: string
  movieTitle: string
  date: string
  time: string
  endTime: string
  peatixUrl: string
}
