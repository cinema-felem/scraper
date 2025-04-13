const TMDBKey = process.env.TMDB_API_KEY

import { getEditDistance } from '../../../text'

export type BaseMovie = {
  filmTitle: string
}

export type TMDBError = {
  success: boolean
  status_code: number
  status_message: string
}

export type TMDBSearchResults = {
  page: number
  total_results: number
  total_pages: number
  results: TMDBSearchResult[]
}

export type TMDBSearchResult = {
  id: number
  genre_ids: number[]
  original_title: string
  overview: string
  popularity: number
  poster_path?: string
  release_date: string
  title: string
  video: boolean
  vote_average: number
  vote_count: number
  original_language: string
  backdrop_path?: string
  adult: boolean
}

function isTMDBError(result: any): result is TMDBError {
  return (
    'success' in result && 'status_code' in result && 'status_message' in result
  )
}

export type TMDBMovie = {
  id: number
  title: string
  overview: string
  release_date: string
  runtime: number
  genres: Genre[]
  imdb_id: string
  adult: boolean
  belongs_to_collection?: string
  budget: number
  backdrop_path?: string
  homepage?: string
  original_title?: string
  original_language?: string
  popularity?: number
  poster_path?: string
  status?: string
  tagline?: string
  video?: boolean
  vote_average?: number
  vote_count?: number
  origin_country: string[]
  production_companies: ProductionCompany[]
  production_countries: ProductionCountry[]
  revenue: number
  spoken_languages: SpokenLanguage[]
  release_dates: ReleaseDates
  videos: { results: Video[] }
  external_ids: ExternalIds
  'watch/providers': {
    results: FilmWatchProviders
  }
}

export interface FilmWatchProviders {
  [key: string]: CountryWatchProvider
}

export interface CountryWatchProvider {
  link: string
  flatrate?: StreamingProviders[]
  buy?: StreamingProviders[]
  rent?: StreamingProviders[]
}

export interface StreamingProviders {
  logo_path: string
  provider_id: number
  provider_name: string
  display_priority: number
}

export // type ReleaseDates = {
//   results: {
//     iso_3166_1: string
//     release_dates: ReleaseDate[]
//   }[]
// }

interface ExternalIds {
  imdb_id?: string
  wikidata_id?: string
  facebook_id?: string
  instagram_id?: string
  twitter_id?: string
}

export interface MovieExternalIds extends ExternalIds {
  tmdb_id: string
}

export interface Video {
  iso_639_1: string
  iso_3166_1: string
  name: string
  key: string
  site: string
  size: number
  type: string
  official: boolean
  published_at: string
  id: string
}

export type Genre = {
  id: number
  name: string
}

export type ProductionCompany = {
  id: number
  logo_path: string
  name: string
  origin_country: string
}

export type ProductionCountry = {
  iso_3166_1: string
  name: string
}

export type SpokenLanguage = {
  english_name: string
  iso_639_1: string
  name: string
}

export type ReleaseDate = {
  certification: string
  descriptors: string[]
  iso_639_1: string
  note: string
  release_date: string
  type: number
}

export type ReleaseDates = {
  results: {
    iso_3166_1: string
    release_dates: ReleaseDate[]
  }[]
}

export type ProcessedMovie = BaseMovie & {
  title: string
  original_title?: string
  original_language?: string
  origin_country?: string[]
  image: {
    poster_path?: string
    backdrop_path?: string
  }
  videos: Video[]
  release_date?: string
  parental?: string
  runtime: number
  spoken_languages: SpokenLanguage[]
  genres: Genre[]
  ratings: MovieRatings[]
  overview: string
  external_ids: MovieExternalIds
  recommendations: string
  streaming: CountryWatchProvider
}

export type MovieRatings = {
  source: string
  rating: number
  votes?: number
}

/**
 * Looks up a movie on TMDB by title or ID
 * @param {Object} params - The parameters for the lookup
 * @param {string} params.filmTitle - The title of the movie
 * @param {number} [params.tmdbId] - The TMDB ID of the movie (optional)
 * @param {boolean} [params.simplified=true] - Whether to return simplified movie data
 * @returns {Promise<ProcessedMovie | TMDBMovie | null>} Movie information or null if not found
 */
export const lookupMovieOnTMDB = async ({
  filmTitle,
  tmdbId,
}: {
  filmTitle?: string
  tmdbId?: number | null
}): Promise<ProcessedMovie | null> => {
  try {
    if (!tmdbId) {
      const searchResults = await searchMovieOnTMDB(filmTitle)
      if (searchResults.length === 0) {
        console.log(`No TMDB search results found for "${filmTitle}"`)
        return null
      }
      const tmdbSortedResults = sortTMDBResults(filmTitle, searchResults)
      const [bestResult] = tmdbSortedResults
      tmdbId = bestResult.id
    }

    const tmdbMovie = await lookupMovieDetailsOnTMDB(tmdbId)
    const sgRelease = getMovieReleaseDate(tmdbMovie)
    const sgStreaming = getMovieStreaming(tmdbMovie)
    const videos = topNTMDBVideoResults(tmdbMovie)
    const completeMovie: ProcessedMovie = {
      filmTitle: filmTitle,
      title: tmdbMovie.title,
      original_title: tmdbMovie.original_title,
      original_language: tmdbMovie.original_language,
      origin_country: tmdbMovie.origin_country,
      image: {
        poster_path: tmdbMovie.poster_path,
        backdrop_path: tmdbMovie.backdrop_path,
      },
      videos,
      release_date: sgRelease?.release_date,
      parental: sgRelease?.certification,
      runtime: tmdbMovie.runtime,
      spoken_languages: tmdbMovie.spoken_languages,
      genres: tmdbMovie.genres,
      ratings: [
        {
          source: 'The Movie Database',
          rating: tmdbMovie.vote_average,
          votes: tmdbMovie.vote_count,
        },
      ],
      overview: tmdbMovie.overview,
      external_ids: {
        tmdb_id: tmdbId.toString(),
        ...tmdbMovie.external_ids,
      },
      streaming: sgStreaming,
      recommendations: `https://www.themoviedb.org/movie/${tmdbId}#recommendation_waypoint`,
    }

    return completeMovie
  } catch (error) {
    console.error(`Error looking up movie "${filmTitle}":`, error)
    return null
  }
}

const toNumber = (booleanValue: boolean): number => {
  return booleanValue ? 1 : 0
}

const topNTMDBVideoResults = (
  tmdbMovie: TMDBMovie,
  videoCount: number = 5,
): Video[] => {
  if (!tmdbMovie?.videos?.results) return []
  const sortedResults = tmdbMovie.videos.results?.sort(
    (a: Video, b: Video): number => {
      const {
        official: official_a,
        type: type_a,
        size: size_a,
        published_at: published_at_a,
      } = a
      const {
        official: official_b,
        type: type_b,
        size: size_b,
        published_at: published_at_b,
      } = b
      if (official_a !== official_b) {
        //prioritise official videos
        return toNumber(official_b) - toNumber(official_a)
      }
      if (type_a !== type_b) {
        // video type
        // prioritise trailers
        if (type_a === 'Trailer') return -1
        if (type_b === 'Trailer') return 1
      }
      if (size_a !== size_b) {
        //prioritise higher res
        return size_b - size_a
      }
      return toNumber(new Date(published_at_b) > new Date(published_at_a))
    },
  )

  if (!sortedResults) return []
  return sortedResults.slice(0, videoCount)
}

const getMovieReleaseDate = (tmdbMovie: TMDBMovie): Partial<ReleaseDate> => {
  let limitedTheatrical: Partial<ReleaseDate> = {}
  if (!tmdbMovie?.release_dates?.results?.length) return limitedTheatrical
  let sgReleases = tmdbMovie.release_dates.results.find(
    result => result.iso_3166_1 === 'SG',
  )
  if (!sgReleases) return limitedTheatrical

  for (const result of sgReleases.release_dates) {
    switch (result?.type) {
      case 2:
        limitedTheatrical = result
        break // 2 Theatrical (Limited)
      case 3:
        return result
    }
  }

  return limitedTheatrical
}

const getMovieStreaming = (tmdbMovie: TMDBMovie): CountryWatchProvider => {
  if (!tmdbMovie?.['watch/providers']?.results?.SG) return
  const sgReleases = tmdbMovie?.['watch/providers']?.results?.SG
  return sgReleases
}

/**
 * Fetches detailed movie information from TMDB API
 * @param {number} movieId - The TMDB ID of the movie
 * @returns {Promise<TMDBMovie>} Detailed movie information
 * @throws {Error} When the API request fails
 */
export const lookupMovieDetailsOnTMDB = async (
  movieId: number,
): Promise<TMDBMovie> => {
  const url =
    `https://api.themoviedb.org/3/movie/${movieId}?` +
    new URLSearchParams({
      append_to_response: 'release_dates,videos,external_ids,watch/providers',
    })
  const options = {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDBKey}`,
    },
    method: 'GET',
    // Add timeout to prevent hanging requests
    signal: AbortSignal.timeout(10000), // 10 second timeout
  }

  try {
    console.log(`Fetching TMDB details for movie ID ${movieId}`)
    const result = await fetch(url, options)

    if (!result.ok) {
      throw new Error(
        `TMDB API returned status ${result.status}: ${result.statusText}`,
      )
    }

    const resultJSON = await result.json()

    if (isTMDBError(resultJSON)) {
      throw new Error(`TMDB API error: ${resultJSON.status_message}`)
    }

    return resultJSON as TMDBMovie
  } catch (error) {
    console.error(`Error fetching TMDB details for movie ID ${movieId}:`, error)
    throw error
  }
}

export type TMDBSearchQueryParamsType = {
  query: string // "Harry Potter",
  include_adult?: boolean // "false"
  language?: string // "en-US"
  primary_release_year?: string // "2019"
  page?: number // "1"
  region?: string // "sg"
  year?: string // "2024"
}

/**
 * Searches for movies on TMDB API by title
 * @param {string} movieTitle - The title of the movie to search for
 * @returns {Promise<TMDBSearchResult[]>} Array of search results
 * @throws {Error} When the API request fails
 */
const searchMovieOnTMDB = async (
  movieTitle: string,
): Promise<TMDBSearchResult[]> => {
  // TMDBSearchQueryParamsType
  const queryParams: Record<string, string> = {
    query: movieTitle,
    include_adult: 'false',
  }
  const url =
    `https://api.themoviedb.org/3/search/movie?` +
    new URLSearchParams(queryParams)
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDBKey}`,
    },
    // Add timeout to prevent hanging requests
    signal: AbortSignal.timeout(10000), // 10 second timeout
  }

  try {
    console.log(`Searching TMDB for movie title: "${movieTitle}"`)
    const result = await fetch(url, options)

    if (!result.ok) {
      throw new Error(
        `TMDB API returned status ${result.status}: ${result.statusText}`,
      )
    }

    const searchResponse: TMDBSearchResults | TMDBError = await result.json()

    if (isTMDBError(searchResponse)) {
      throw new Error(`TMDB API error: ${searchResponse.status_message}`)
    }

    return searchResponse.results
  } catch (error) {
    console.error(`Error searching TMDB for "${movieTitle}":`, error)
    // Return empty array instead of throwing to allow processing to continue
    return []
  }
}

const getSearchTermDistance = (
  searchTerm: string,
): ((tmdbResult: TMDBSearchResult) => number) => {
  return (tmdbResult: TMDBSearchResult): number => {
    const { original_title, title } = tmdbResult
    const originalTitleDistance: number = getEditDistance(
      searchTerm,
      original_title,
    )
    const titleDistance: number = getEditDistance(searchTerm, title)

    const distance =
      originalTitleDistance < titleDistance
        ? originalTitleDistance
        : titleDistance

    return distance
  }
}

// TODO: Check
const sortTMDBResults = (
  movieTitle: string,
  tmdbResults: TMDBSearchResult[],
): TMDBSearchResult[] => {
  if (!tmdbResults) return []
  const calculateDistance = getSearchTermDistance(movieTitle)
  const sortedMovies = tmdbResults.sort((a, b) => {
    const { release_date: a_date, popularity: a_popularity } = a
    const { release_date: b_date, popularity: b_popularity } = b
    const b_distance = calculateDistance(b)
    const a_distance = calculateDistance(a)
    if (Math.abs(a_distance - b_distance) < 5) {
      const a_unixTime = new Date(a_date).getTime()
      const b_unixTime = new Date(b_date).getTime()
      const dateDiffDays =
        Math.abs(b_unixTime - a_unixTime) / (1000 * 60 * 60 * 24)
      if (Math.abs(dateDiffDays) < 365) {
        return b_popularity - a_popularity // descending
      }
      return b_unixTime - a_unixTime // descending
    }
    return a_distance - b_distance
  })
  return sortedMovies
}
