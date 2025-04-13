import { MovieRatings } from './tmdb'

const traktClientID = process.env.TRAKT_CLIENT_ID
const traktClientSecret = process.env.TRAKT_CLIENT_SECRET

interface RatingDistribution {
  [key: string]: number
}

interface RatingData {
  rating: number
  votes: number
  distribution: RatingDistribution
}

export const lookupRatingsOnTrakt = async (
  imdbId: string,
): Promise<MovieRatings> => {
  const url = `https://api.trakt.tv/movies/${imdbId}/ratings`
  const options = {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': traktClientID,
    },
    method: 'GET',
  }

  const result = await fetch(url, options)
  const ratings: RatingData = await result.json()

  return {
    source: 'Trakt',
    rating: ratings.rating,
    votes: ratings.votes,
  }
}
