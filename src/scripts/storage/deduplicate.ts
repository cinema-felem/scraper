import { getEditDistance } from '../../text'

interface Showtime {
  filmId: string
  chainSpecific?: {
    movieTitle?: string
  }
}

interface Movie {
  id: string
  filmTitle: string
  sourceIds: string[]
}

interface UpdateResult {
  showtimes: Showtime[]
  movies: Movie[]
}

const updateShowtimes = (
  showtimesList: Showtime[],
  moviesList: Movie[],
): UpdateResult => {
  const missingMoviesRecords = new Set<string>()
  const missingMoviesInfo: { [key: string]: string | undefined } = {}

  const updatedList = showtimesList.map(showtime => {
    const { filmId } = showtime
    let found = false

    for (const movie of moviesList) {
      if (movie.id === filmId) {
        found = true
        break
      }
      if (movie.sourceIds.includes(filmId)) {
        showtime.filmId = movie.id
        found = true
        break
      }
    }

    if (!found) {
      missingMoviesRecords.add(showtime.filmId)
      missingMoviesInfo[showtime.filmId] = showtime?.chainSpecific?.movieTitle
    }

    return showtime
  })

  let newIdSet = false
  for (const missingMovieId of missingMoviesRecords) {
    const showtimeMovieName = missingMoviesInfo[missingMovieId]
    if (!showtimeMovieName) continue

    for (const movieIndex in moviesList) {
      const movie = moviesList[movieIndex]
      if (getEditDistance(movie.filmTitle, showtimeMovieName) === 0) {
        moviesList[movieIndex].sourceIds.push(missingMovieId)
        newIdSet = true
        break
      }
    }
  }

  if (newIdSet) return updateShowtimes(updatedList, moviesList)
  return { showtimes: updatedList, movies: moviesList }
}

export const mergeMovies = updateShowtimes
