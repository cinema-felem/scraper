interface EagleWingMovieDetails {
  link: string
  image: string
  title: string
  rating: string
  openingdate: string
  description: string
}

interface EagleWingErrorCode {
  ErrorCode: string
  ErrorMessage: string
}

interface EagleWingMoviesResponse {
  ErrorCode: string
  ErrorMessage: string
  data?: any
}

const EAGLEWING_HEADERS = {
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua':
    '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-csrf-token': 'oMYYscZ9990fXVg7vi0FAd6uMYEv6I5S4YYspcWi',
  'x-requested-with': 'XMLHttpRequest',
  'x-xsrf-token':
    'eyJpdiI6IjZQMlhYTXdiMk5hYVwvSHcyVmJqNGZBPT0iLCJ2YWx1ZSI6InhEQU9Cc0lQV1FIcHlBQXgyb1ZjWU5KSkFnb1pJb0tVWW8yZlhvdnFaNTUwU3lvcjF6dm5iTGxYcXYrM0FCMVAiLCJtYWMiOiJmODQwZjdlNzM0ZjdiMWNlMmM0MDQyNjBmZWUxMjNiYWE0YTE5ZDhmNjcxNWRlNDFkMGE1MTljOWE5OTBhNzA2In0=',
}

export const fetchMovies = async (): Promise<EagleWingMoviesResponse> => {
  try {
    const response = await fetch(
      'https://www.eaglewingscinematics.com.sg/api/v1/film/showings',
      {
        headers: EAGLEWING_HEADERS,
        referrer: 'https://www.eaglewingscinematics.com.sg/movies',
        referrerPolicy: 'strict-origin-when-cross-origin',
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
      },
    )
    return await response.json()
  } catch (error) {
    console.error('Error fetching Eagle Wing movies:', error)
    return {
      ErrorCode: 'FETCH_ERROR',
      ErrorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

export const fetchShowtimes = async (): Promise<any> => {
  // TODO: Implement showtime fetching
  return {}
}

export const fetchCinemas = async (): Promise<any> => {
  // TODO: Implement cinema fetching
  return {}
}
