require('dotenv').config()
const { getEditDistance } = require('../text')

const { lookupMovieOnTMDB } = require('../../../dist/metadata/wrapper/tmdb')

const { lookupRatingsOnOMDB } = require('../../../dist/metadata/wrapper/omdb')

const { lookupRatingsOnTrakt } = require('../../../dist/metadata/wrapper/trakt')

const { lookupRatingsOnLetterboxd } = require('./wrapper/letterboxd')

const { retrieveMovies, updateTMDB, retrieveTMDB } = require('../storage/movie')

const lookupMovies = async () => {
  // movies = [{ filmTitle: 'Transformers One' }]
  const movies = await retrieveMovies()
  const moviesPromise = movies.map(async movie => {
    if (movie.tmdbId) {
      const storedTMDBMovie = await retrieveTMDB(movie.tmdbId)
      const updatedAt = new Date(storedTMDBMovie.updatedAt).getTime()
      const currentTime = new Date().getTime()
      if (currentTime - updatedAt < 1000 * 60 * 60 * 24 * 7)
        return storedTMDBMovie
    }
    const simplified = true
    console.log(movie.title)
    const apiMovie = await lookupMovieOnTMDB({
      tmdbId: movie.tmdbId,
      filmTitle: movie.title,
      simplified,
    })
    if (apiMovie?.external_ids?.imdb_id) {
      const imdbId = apiMovie?.external_ids?.imdb_id
      const omdbRatings = await lookupRatingsOnOMDB(imdbId)
      const traktRatings = await lookupRatingsOnTrakt(imdbId)
      apiMovie.ratings.push(traktRatings)
      apiMovie.ratings = apiMovie.ratings.concat(omdbRatings)
    }
    if (apiMovie?.external_ids?.tmdb_id) {
      await updateTMDB(movie, apiMovie)
    } else {
      console.log(apiMovie)
    }
    return apiMovie
  })
  return Promise.all(moviesPromise)
}

module.exports = {
  lookupMovies,
}
