const fs = require('fs')

const updateShowtimes = (showtimesList, moviesList) => {
  const missingMoviesRecords = new Set()
  const missingMoviesInfo = {}
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
      // missingMoviesInfo[showtime.filmId] = showtime;
      // delete showtime;
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

module.exports = {
  mergeMovies,
}
