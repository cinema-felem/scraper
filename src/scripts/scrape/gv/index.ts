import {
  fetchDateShowtimes,
  fetchShowingMovieList,
  fetchComingSoonMoviesList,
  fetchAdvancedSalesMoviesList,
  fetchCinemasApi,
} from './scrape'
import { flattenShowtimes } from './transform'
import { GVCinema, GVCinemaShowtime, GVMovies } from './types'
import { uniqByKeepFirst } from './utils'

export const fetchShowtimes = async (): Promise<GVCinemaShowtime[]> => {
  const days = 7
  const queryDate = new Date()
  queryDate.setHours(0, 0, 0, 0)
  let showtimes: GVCinemaShowtime[] = []
  for (let i = 0; i < days; i++) {
    const dayShowtimeResponse = await fetchDateShowtimes(queryDate.getTime())
    const dayShowtime = dayShowtimeResponse?.data.cinemas ?? []
    const flatCinemaShowtime = flattenShowtimes(dayShowtime)
    showtimes = showtimes.concat(flatCinemaShowtime)
    queryDate.setDate(queryDate.getDate() + 1)
  }
  return showtimes
}

export const fetchMovies = async (): Promise<GVMovies[]> => {
  const showingMoviesList = await fetchShowingMovieList()
  const comingMoviesList = await fetchComingSoonMoviesList()
  const advancedMoviesList = await fetchAdvancedSalesMoviesList()

  const moviesResponse = await Promise.all([
    showingMoviesList,
    comingMoviesList,
    advancedMoviesList,
  ])
  let moviesList: GVMovies[] = []

  for (const requestObject of moviesResponse) {
    if (
      requestObject &&
      requestObject?.success &&
      requestObject?.data.length > 0
    ) {
      moviesList = moviesList.concat(requestObject.data as GVMovies[])
    }
  }

  return uniqByKeepFirst(moviesList, movie => movie.filmCd)
}

export const fetchCinemas = async (): Promise<GVCinema[]> => {
  const requestObject = await fetchCinemasApi()
  if (requestObject && requestObject?.success && requestObject?.data.length > 0)
    return requestObject.data

  return requestObject.data
}
