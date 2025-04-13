export interface Movies {
  title?: string
  format?: string
  language?: string
  genre?: string[]
  duration?: string
  parentalRating?: string
  url?: string
}

export interface Cinemas {
  id?: string
  url?: string
  cinemaName: string
  address: string
  nearestMRTStation: string
  gMapsLink: string
}

export interface Showtime {
  [link: string]: {
    cinemaName: string
    dateFull: string
    hour: string
    dateOnly: string
    showTime: string
    title: string
    fullTitle: string
    link: string
    pms: string
    filmId: string
    session_id?: string
    sold_out?: string
    cinema_id?: string
    subtitle?: string
  }
}
