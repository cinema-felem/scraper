import 'dotenv/config'
import { lookupMovieOnTMDB, ProcessedMovie } from './wrapper/tmdb'
import { lookupRatingsOnOMDB } from './wrapper/omdb'
import { lookupRatingsOnTrakt } from './wrapper/trakt'
import { lookupRatingsOnLetterboxd } from './wrapper/letterboxd'
import { retrieveMovies, updateMovieTMDB, retrieveTMDB } from '../storage/movie'
import { Movie as PrismaMovie, tmdb as PrismaTMDB } from '@prisma/client'
import logger from '../../utils/logger'

/**
 * Looks up metadata for all movies in the database
 * Processes each movie sequentially to prevent resource contention with Selenium
 * @returns {Promise<TMDBMovie[]>} Array of movies with metadata
 */
export const lookupMovies = async (): Promise<
  (ProcessedMovie | PrismaTMDB)[]
> => {
  const movies = await retrieveMovies()
  const results: (ProcessedMovie | PrismaTMDB)[] = []

  logger.info(`Processing metadata for ${movies.length} movies sequentially`)

  // Process each movie sequentially instead of in parallel
  for (const movie of movies) {
    if (movie.tmdbId) {
      const storedTMDBMovie: PrismaTMDB | null = await retrieveTMDB(
        movie.tmdbId,
      )
      if (storedTMDBMovie?.updatedAt) {
        const updatedAt = new Date(storedTMDBMovie.updatedAt).getTime()
        const currentTime = new Date().getTime()
        // Check if the stored data is recent (within a week)
        if (currentTime - updatedAt < 1000 * 60 * 60 * 24 * 7) {
          logger.info(
            `Using cached data for ${movie.title} (TMDB ID: ${movie.tmdbId})`,
          )
          results.push(storedTMDBMovie)
          continue // Skip to the next movie
        }
      }
    }

    const apiMovie: ProcessedMovie | null = await fetchAndEnrichMovie(movie)

    if (apiMovie?.external_ids?.tmdb_id) {
      await updateMovieTMDB(movie, apiMovie)
    } else {
      logger.warn('No TMDB ID found:', apiMovie)
    }

    // Add the movie to results if it's not null
    if (apiMovie) {
      results.push(apiMovie)
    }
  }

  logger.info(`Completed metadata processing for ${results.length} movies`)
  return results
}

/**
 * Fetches movie data from TMDB and enriches it with ratings from multiple sources
 * @param {PrismaMovie} movie - The movie to fetch data for
 * @returns {Promise<ProcessedMovie | null>} Processed movie data with ratings
 */
export const fetchAndEnrichMovie = async (
  movie: PrismaMovie,
): Promise<ProcessedMovie | null> => {
  const apiMovie: ProcessedMovie | null = await lookupMovieOnTMDB({
    tmdbId: movie.tmdbId,
    filmTitle: movie.title,
  })

  logger.info(
    `Retrieved movie data for ${movie.title} (TMDB ID: ${apiMovie?.external_ids?.tmdb_id})`,
  )

  if (!apiMovie) {
    logger.warn(`No API data found for ${movie.title}`)
    return null
  }

  if (!apiMovie.ratings) {
    apiMovie.ratings = []
  }

  // Get ratings from different sources
  const imdbId = apiMovie.external_ids?.imdb_id
  const tmdbId = apiMovie.external_ids?.tmdb_id || String(movie.tmdbId)

  if (imdbId) {
    try {
      logger.info(`Fetching Trakt ratings for ${movie.title}`)
      const traktRatings = await lookupRatingsOnTrakt(imdbId)
      if (traktRatings) apiMovie.ratings.push(traktRatings)
    } catch (error) {
      logger.error(`Error fetching Trakt ratings for ${movie.title}:`, error)
    }

    try {
      logger.info(`Fetching OMDB ratings for ${movie.title}`)
      const omdbRatings = await lookupRatingsOnOMDB(imdbId)
      if (omdbRatings) apiMovie.ratings.concat(omdbRatings)
    } catch (error) {
      logger.error(`Error fetching OMDB ratings for ${movie.title}:`, error)
    }
  }

  // Fetch Letterboxd ratings
  if (tmdbId) {
    try {
      logger.info(`Fetching Letterboxd ratings for ${movie.title}`)
      const letterboxdRatings = await lookupRatingsOnLetterboxd(tmdbId)
      if (letterboxdRatings) apiMovie.ratings.push(letterboxdRatings)
    } catch (error) {
      logger.error(
        `Error fetching Letterboxd ratings for ${movie.title}:`,
        error,
      )
    }
  }

  logger.info(`Retrieved ratings for ${movie.title}:`, apiMovie.ratings)
  return apiMovie
}
