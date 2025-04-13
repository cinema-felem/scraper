export interface Movie {
  veeziFilmId: string
  title: string
  rating: 'PG13' | 'M18' | 'NC16' | 'R21' | 'PG' | string
  description: string // From blurbHtml
  coverImage: string
  url: string
  order: number
  categories: string[] // e.g., ["Crime", "Drama"]
  themes: Themes[]
  eventTypes: string[] // ["film"]
  releasingSchedules: string[] // ["New Release", "Projector Exclusive"]
  subtitles: string[] // ["en", "zh"]
  movieDetail?: Film
}

interface Themes {
  // e.g., "Asian Cinema", "Awards Season"
  slug: string
  id: string
  title: string
}

interface Screen {
  veeziScreenId: number
}

interface Venue {
  title: string
  screens: Screen[] | null
  accessibility: string[] | null
}

export interface Cinema {
  title: string
  veeziToken: string
  venues: Venue[]
}

type Rating = 'PG13' | 'M18' | 'NC16' | 'R21' | 'PG' // From previous definitions

export interface Film {
  Id: string
  Title: string
  ShortName: string
  Synopsis: string
  Genre: string
  SignageText: string
  Distributor: string
  OpeningDate: string // ISO date format
  Rating: Rating
  Status: string
  Content: string
  Duration: number
  DisplaySequence: number
  NationalCode: string | null // All Null
  Format: string
  IsRestricted: boolean
  People: People[] // Could be typed further if person structure is known
  AudioLanguage: string | null // all null
  GovernmentFilmTitle: string | null // all null
  FilmPosterUrl: string
  FilmPosterThumbnailUrl: string
  BackdropImageUrl: string
  FilmTrailerUrl: string
  Attributes: unknown[] // All Empty
}

interface People {
  Id: string
  FirstName: string
  LastName: string
  Role: string
}

export interface Screening {
  Url: string
  Id: number
  FilmId: string
  FilmPackageId: string | null
  Title: string
  ScreenId: number
  Seating: string
  AreComplimentariesAllowed: boolean
  TicketsSoldOut: boolean
  FewTicketsLeft: boolean
  ShowType: string
  SalesVia: string[]
  Status: string
  PreShowStartTime: string
  SalesCutOffTime: string
  FeatureStartTime: string
  FeatureEndTime: string
  CleanupEndTime: string
  SeatsAvailable: number
  SeatsHeld: number
  SeatsHouse: number
  SeatsSold: number
  FilmFormat: string
  PriceCardName: string
  Attributes: unknown[]
  AudioLanguage: string | null
}
