import {
  fetchAdvanceMoviesList,
  fetchCinemaList,
  fetchComingMoviesList,
  fetchFilmFestival,
  fetchNowShowingMoviesList,
  getDateShowtimes,
} from './scrape'
import { Cinema, Movie, MovieShowtime, MovieShowtimeRaw } from './types'
import { partition, uniqByKeepFirst } from './utils'

export const fetchMovies = async (): Promise<Movie[]> => {
  const nowShowingMoviesList: Movie[] = await fetchNowShowingMoviesList()
  const advanceMoviesList: Movie[] = await fetchAdvanceMoviesList()
  const comingMoviesList: Movie[] = await fetchComingMoviesList()

  let [nowShowingMovies, filmFestivals] = partition(
    nowShowingMoviesList,
    movie => movie.code === null,
  )

  for (const filmFestival of filmFestivals) {
    const filmFestivalMovies = await fetchFilmFestival(filmFestival.code)
    nowShowingMovies = nowShowingMovies.concat(filmFestivalMovies)
  }

  const moviesList = [
    ...nowShowingMovies,
    ...advanceMoviesList,
    ...comingMoviesList,
  ]

  return uniqByKeepFirst(moviesList, movie => movie.movieReleaseId)
}

export const fetchCinemas = async (): Promise<Cinema[]> => {
  return await fetchCinemaList()
}

const flattenShowtimes = (
  exist: MovieShowtime[],
  newRecords: MovieShowtimeRaw[],
) => {
  if (!(newRecords.length > 0)) {
    return exist
  }
  for (const cinemaMovieShowtimes of newRecords) {
    const { showTimes: movieTimeslots, ...movieInfo } = cinemaMovieShowtimes
    for (const timeslot of movieTimeslots) {
      const movieTimeslotContext: MovieShowtime = {
        ...movieInfo,
        ...timeslot,
      }
      exist.push(movieTimeslotContext)
    }
  }
  return exist
}

export const fetchShowtimes = async () => {
  const days = 7
  const queryDate = new Date()
  queryDate.setHours(0, 0, 0, 0)
  let showtimes: MovieShowtime[] = []

  for (let i = 0; i < days; i++) {
    const dayShowtimeObject: MovieShowtimeRaw[] =
      await getDateShowtimes(queryDate)
    showtimes = flattenShowtimes(showtimes, dayShowtimeObject)
    queryDate.setDate(queryDate.getDate() + 1)
  }
  return showtimes
}
