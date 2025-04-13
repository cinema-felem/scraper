const OMDBKey = process.env.OMDB_API_KEY
import { MovieRatings } from './tmdb'
type OMDBMovie = {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: Rating[]
  Metascore: string
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  DVD: string
  BoxOffice: string
  Production: string
  Website: string
  Response: boolean
}

type Rating = {
  Source: string
  Value: string
}

/**
 * Fetches movie ratings from OMDB API
 * @param {string} imdbID - The IMDB ID of the movie
 * @returns {Promise<MovieRatings[]>} Array of normalized movie ratings
 * @throws {APIError} When API request fails
 */
export const lookupRatingsOnOMDB = async (
  imdbID: string,
): Promise<MovieRatings[]> => {
  if (!OMDBKey) {
    console.warn('OMDB_API_KEY environment variable is not set')
    return []
  }

  if (!imdbID) {
    console.warn('Invalid IMDB ID provided to OMDB API')
    return []
  }

  const searchParams = {
    i: imdbID,
    type: 'movie',
    apikey: OMDBKey,
    r: 'json',
  }

  try {
    const movieRequest = await fetch(
      `https://www.omdbapi.com/?` + new URLSearchParams(searchParams),
      {
        method: 'GET',
      },
    )
    
    if (!movieRequest.ok) {
      console.error(`OMDB API request failed with status: ${movieRequest.status}`)
      return []
    }
    
    const omdbMovie: OMDBMovie = await movieRequest.json()
    
    if (!omdbMovie || omdbMovie.Response === false) {
      return []
    }
    
    const ratings = normaliseRatings(omdbMovie)
    return ratings
  } catch (error) {
    console.error(`Error fetching OMDB data for ${imdbID}:`, error)
    return []
  }
}

/**
 * Normalizes movie ratings from OMDB API format to internal format
 * @param {OMDBMovie} omdbMovie - The movie data from OMDB API
 * @returns {MovieRatings[]} Normalized ratings array
 */
const normaliseRatings = (omdbMovie: OMDBMovie): MovieRatings[] => {
  // Handle case where Ratings is undefined or null
  if (!omdbMovie || !omdbMovie.Ratings || !Array.isArray(omdbMovie.Ratings)) {
    return []
  }
  
  const ratings = omdbMovie.Ratings
  const normalisedRatings = ratings.map(rating => {
    let votes: number | undefined
    const { Source, Value } = rating
    if (Source === 'Internet Movie Database') {
      const imdbVotes = omdbMovie?.imdbVotes?.replaceAll(',', '')
      votes = Number(imdbVotes)
    }

    let normalisedValue = -1
    if (Value.includes('/100'))
      normalisedValue = Number(Value.replace('/100', '')) / 10
    else if (Value.includes('%')) {
      normalisedValue = Number(Value.replace('%', ''))
      normalisedValue /= 10
    } else if (Value.includes('/10')) {
      normalisedValue = Number(Value.replace('/10', ''))
    }

    return {
      source: Source,
      rating: normalisedValue,
      votes: votes,
    }
  })
  return normalisedRatings
}
