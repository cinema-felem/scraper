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

export const lookupRatingsOnOMDB = async (
  imdbID: string,
): Promise<MovieRatings[]> => {
  const searchParams = {
    i: imdbID,
    type: 'movie',
    apikey: OMDBKey,
    r: 'json',
  }

  const movieRequest = await fetch(
    `https://www.omdbapi.com/?` + new URLSearchParams(searchParams),
    {
      method: 'GET',
    },
  )
  const omdbMovie: OMDBMovie = await movieRequest.json()
  if (omdbMovie.Response === false) return
  const ratings = normaliseRatings(omdbMovie)
  return ratings
}

const normaliseRatings = (omdbMovie: OMDBMovie): MovieRatings[] => {
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
