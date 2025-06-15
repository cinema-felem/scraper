import {
  fetchAdvanceMoviesList,
  fetchCinemaList,
  fetchComingMoviesList,
  fetchFilmFestival,
  fetchNowShowingMoviesList,
  getDateShowtimes,
} from './scrape'
import {
  flattenShowtimes as genericFlattenShowtimes,
  BaseTimeslot, // Not strictly needed if ShowTime doesn't extend it, but good for consistency
  FlattenedShowtime,
} from '../../transform/shared'
import {
  Cinema,
  Movie,
  MovieShowtime,
  MovieShowtimeRaw,
  ShowTime,
} from './types'
import { partition, uniqByKeepFirst } from './utils'

export const fetchMovies = async (): Promise<Movie[]> => {
  const nowShowingMoviesList: Movie[] = await fetchNowShowingMoviesList()
  const advanceMoviesList: Movie[] = await fetchAdvanceMoviesList()
  const comingMoviesList: Movie[] = await fetchComingMoviesList()

  let [nowShowingMovies, filmFestivals] = partition(
    nowShowingMoviesList,
    movie => movie.code === null,
  )

  // Film festival movies are sometimes included in nowShowingMoviesList but have a 'code'.
  // These need to be fetched separately using their specific festival code.
  for (const filmFestival of filmFestivals) {
    const filmFestivalMovies = await fetchFilmFestival(filmFestival.code)
    nowShowingMovies = nowShowingMovies.concat(filmFestivalMovies)
  }

  const moviesList = [
    ...nowShowingMovies,
    ...advanceMoviesList,
    ...comingMoviesList,
  ]

  // Deduplicate movies by their movieReleaseId, keeping the first occurrence.
  return uniqByKeepFirst(moviesList, movie => movie.movieReleaseId)
}

export const fetchCinemas = async (): Promise<Cinema[]> => {
  return await fetchCinemaList()
}

// Type for the context part of MovieShowtimeRaw after removing showTimes
type ShawMovieContext = Omit<MovieShowtimeRaw, 'showTimes'>

export const fetchShowtimes = async (): Promise<MovieShowtime[]> => {
  const days = 7 // Fetch showtimes for the next 7 days.
  const queryDate = new Date()
  queryDate.setHours(0, 0, 0, 0) // Start from today at 00:00.
  let allShowtimes: MovieShowtime[] = []

  for (let i = 0; i < days; i++) {
    const dailyRawShowtimes: MovieShowtimeRaw[] =
      await getDateShowtimes(queryDate)

    if (dailyRawShowtimes && dailyRawShowtimes.length > 0) {
      const flattenedDailyShowtimes = genericFlattenShowtimes<
        MovieShowtimeRaw,
        ShowTime,
        ShawMovieContext
      >(
        dailyRawShowtimes,
        rawShowtime => rawShowtime.showTimes, // getTimeslots
        rawShowtime => {
          // getContext
          const { showTimes, ...context } = rawShowtime
          return context
        },
      )
      // The type of flattenedDailyShowtimes is Array<FlattenedShowtime<ShawMovieContext, ShowTime>>
      // This should be compatible with MovieShowtime[] if MovieShowtime is ShawMovieContext & ShowTime
      allShowtimes = allShowtimes.concat(
        flattenedDailyShowtimes as MovieShowtime[],
      )
    }
    queryDate.setDate(queryDate.getDate() + 1)
  }
  return allShowtimes
}
