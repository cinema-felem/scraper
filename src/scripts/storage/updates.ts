import { PrismaClient, Updates } from '@prisma/client'
import logger from '../../utils/logger'
import * as Sentry from '@sentry/node'
import { lookupMovieOnTMDB, ProcessedMovie } from '../metadata/wrapper/tmdb'
import { updateMovieTMDB } from './movie'
import { fetchAndEnrichMovie } from '../metadata/movies'

const prisma = new PrismaClient()

/**
 * Removes movies that don't have any linked showtimes
 * This helps keep the database clean by removing orphaned movie records
 *
 * @returns {Promise<void>} A promise that resolves when the cleanup is complete
 * @throws {Error} When the database operation fails
 */
export const removeOrphanedMovies = async (): Promise<void> => {
  try {
    logger.info('Starting cleanup of movies without showtimes...')

    // Find all movies that don't have any linked showtimes
    const moviesWithoutShowtimes = await prisma.movie.findMany({
      where: {
        showtimes: {
          none: {},
        },
      },
      select: {
        id: true,
        title: true,
      },
    })

    if (moviesWithoutShowtimes.length === 0) {
      logger.info('No orphaned movies found. Database is clean.')
      return
    }

    // Extract the IDs of movies to be deleted
    const movieIdsToDelete = moviesWithoutShowtimes.map(movie => movie.id)

    // Delete the movies without showtimes
    const deleteResult = await prisma.movie.deleteMany({
      where: {
        id: {
          in: movieIdsToDelete,
        },
      },
    })

    // Log the results
    logger.info(
      `Successfully removed ${deleteResult.count} movies without showtimes`,
      {
        count: deleteResult.count,
        movieTitles: moviesWithoutShowtimes.map(m => m.title),
      },
    )

    // Add transaction statistics to Sentry for monitoring
    Sentry.addBreadcrumb({
      category: 'database',
      message: `Removed ${deleteResult.count} orphaned movies`,
      level: 'info',
      data: {
        count: deleteResult.count,
        operation: 'cleanup',
      },
    })
  } catch (error) {
    logger.error('Failed to clean up movies without showtimes:', error)
    Sentry.captureException(error, {
      tags: {
        operation: 'movie_cleanup',
      },
    })
    throw error
  }
}

/**
 * Processes all pending updates from the updates table and applies them to their respective models
 * This function handles different model updates based on their modelName property
 *
 * @returns {Promise<void>} A promise that resolves when all updates have been processed
 * @throws {Error} When update processing or database operations fail
 */
export const executeUpdates = async (): Promise<void> => {
  try {
    logger.info('Starting to process pending updates...')

    const updates = await prisma.updates.findMany()

    if (updates.length === 0) {
      logger.info('No pending updates found')
      return
    }

    logger.info(`Processing ${updates.length} pending updates`)

    for (const update of updates) {
      switch (update.modelName.toLowerCase()) {
        case 'movie':
          movieUpdates(update)
          continue
        default:
          logger.warn(`Unknown model type encountered: ${update.modelName}`, {
            updateId: update.id,
          })
          continue
      }
    }

    // Delete all processed updates
    const deleteResult = await prisma.updates.deleteMany()

    logger.info(`Successfully deleted ${deleteResult.count} processed updates`)

    // Add transaction statistics to Sentry for monitoring
    Sentry.addBreadcrumb({
      category: 'database',
      message: `Processed ${updates.length} updates`,
      level: 'info',
      data: {
        count: updates.length,
        operation: 'updates',
      },
    })
  } catch (error) {
    logger.error('Failed to process updates:', error)
    Sentry.captureException(error, {
      tags: {
        operation: 'process_updates',
      },
    })
    throw error
  }
}

/**
 * Processes movie-specific updates from the updates table
 * Applies changes to the movie model based on the update data
 *
 * @param {Updates} update - The update record to process
 * @returns {Promise<void>} A promise that resolves when the update is processed
 * @throws {Error} When the update cannot be processed due to invalid data or database errors
 */
const movieUpdates = async (update: Updates): Promise<void> => {
  try {
    // We need an ID to locate the movie to update
    if (update.sourceField !== 'id' && update.operation !== 'update') {
      logger.warn(
        `Unsupported update operation: ${update.operation} on field ${update.sourceField}`,
        {
          updateId: update.id,
        },
      )
      return
    }

    const movieId = update.sourceText

    // Find the movie to update
    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
    })

    if (!existingMovie) {
      logger.warn(`Movie ${movieId} not found for update ${update.id}`, {
        updateId: update.id,
        movieId,
      })
      return
    }

    if (update.destinationField === 'tmdbId' && update.destinationText) {
      const apiMovie: ProcessedMovie | null = await fetchAndEnrichMovie({
        ...existingMovie,
        tmdbId: Number(update.destinationText),
      })
      if (!apiMovie) {
        logger.error(`No API data found for ${update.destinationText}`)
        return
      }
      await updateMovieTMDB(existingMovie, apiMovie)
      return
    }

    logger.info(`Unsupported operation ${update.id}`, {
      updateId: update.id,
      operation: update.operation,
      sourceField: update.sourceField,
      sourceText: update.sourceText,
    })
  } catch (error) {
    logger.error(`Failed to process movie update ${update.id}:`, error, {
      updateId: update.id,
    })
    Sentry.captureException(error, {
      tags: {
        operation: 'movie_update',
        updateId: update.id,
      },
    })
    // Don't rethrow the error to allow processing of other updates
  }
}
