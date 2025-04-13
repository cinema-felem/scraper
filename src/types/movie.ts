/**
 * Movie data types for the cinema scraper project
 */

export interface MovieImage {
  poster_path?: string
  backdrop_path?: string
}

export interface MovieVideo {
  id: string
  key: string
  site?: string
  type?: string
  name?: string
}

export interface MovieGenre {
  id: number
  name: string
}

export interface MovieRating {
  source: string
  rating: number
  votes?: number
}

export interface MovieExternalIds {
  imdb_id?: string
  tmdb_id?: number
  [key: string]: any
}

export interface MovieChainSpecific {
  genre?: string[]
  duration?: string
  parentalRating?: string
  url?: string
  [key: string]: any
}

export interface MovieSource {
  chain: string
  id: string
  details: MovieChainSpecific
}

export interface TMDBMovie {
  id?: number
  createdAt?: Date
  updatedAt?: Date
  title: string
  original_title?: string
  original_language?: string
  origin_country?: string[]
  image?: MovieImage
  videos?: MovieVideo[]
  genres?: MovieGenre[]
  overview?: string
  release_date?: string
  runtime?: number
  ratings: MovieRating[]
  external_ids?: MovieExternalIds
  streaming?: any
}

/**
 * Movie interface aligned with StandardMovie type
 */
export interface Movie {
  id: string
  filmTitle: string
  language?: string
  format?: string
  sourceIds?: string[]
  tmdbId?: number
  source?: MovieSource
  title?: string
  variations?: string[]
  titleVariations?: string[] // For compatibility with MergedMovie
  movieIds?: string[] // For compatibility with MergedMovie
  createdAt?: Date
  updatedAt?: Date
}
