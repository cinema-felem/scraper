import { promises as fs, mkdirSync, readFileSync } from 'fs'
import { EventEmitter } from 'events'
import * as path from 'path'
import { insertCinemas } from './scripts/storage/cinema'
import { insertMovies } from './scripts/storage/movie'
import { insertShowtimes } from './scripts/storage/showtime'
import { removeOrphanedMovies, executeUpdates } from './scripts/storage/updates'
import logger, { initSentry, DataCountMetrics } from './utils/logger'
import * as Sentry from '@sentry/node'

/**
 * Interface for storage operation results
 */
interface StorageOperationResult {
  insertedCount: number;
  updatedCount?: number;
  skippedCount?: number;
  mergedCount?: number;
  invalidCount?: number;
  missedReferences?: Record<string, any>;
  details?: Record<string, any>;
}

/**
 * Interface for update operation results
 */
interface UpdateOperationResult {
  removedCount?: number;
  movieUpdates?: number;
  cinemaUpdates?: number;
  showtimeUpdates?: number;
  details?: Record<string, any>;
}

/**
 * Interface for database counts
 */
interface DatabaseCounts {
  movies: number;
  cinemas: number;
  showtimes: number;
}

// Increase event listener limit
EventEmitter.defaultMaxListeners = 20

// Initialize Sentry for error tracking with centralized logger
initSentry({
  tracesSampleRate: 1.0,
  // Add metadata about this service
  initialScope: {
    tags: {
      service: 'storage',
    },
  },
})

/**
 * Define possible storage steps
 */
type StorageStep = 'cinemas' | 'movies' | 'showtimes' | 'updates'

// Configure which steps to run based on command line arguments
const ALL_STEPS: StorageStep[] = ['cinemas', 'movies', 'showtimes', 'updates']
const steps: StorageStep[] = process.argv[2]
  ? [process.argv[2] as StorageStep]
  : ALL_STEPS

// Read merged data with error handling
let intermediateObject: any = { movies: [], cinemas: [], showtimes: [] };
try {
  const intermediateDataPath = path.join('data/intermediate', 'merge.json');
  const intermediateData = readFileSync(intermediateDataPath, 'utf8');
  intermediateObject = JSON.parse(intermediateData);
  
  // Log information about the loaded data
  logger.addBreadcrumb('file_operation', 'Read intermediate data file', {
    path: intermediateDataPath,
    size: intermediateData.length,
    movieCount: intermediateObject.movies?.length || 0,
    cinemaCount: intermediateObject.cinemas?.length || 0,
    showtimeCount: intermediateObject.showtimes?.length || 0
  });
} catch (error) {
  logger.error('Error reading intermediate data:', error);
  Sentry.captureException(error);
  // Continue with empty data
}

// Ensure merge directory exists
mkdirSync('data/merge/', { recursive: true })

/**
 * Apply database updates based on the updates configuration
 */
async function applyUpdates(): Promise<void> {
  // Create a transaction for update operations
  const transaction = logger.startTransaction(
    'apply_database_updates', 
    'storage',
    { step: 'updates' }
  );
  
  try {
    logger.info('Starting database update operations');
    
    // Remove orphaned movies with tracing
    const orphanedSpan = transaction.startChild('remove_orphaned_movies');
    try {
      logger.addBreadcrumb('storage_updates', 'Removing orphaned movies');
      const result = await removeOrphanedMovies() as unknown as UpdateOperationResult;
      const removedCount = result?.removedCount || 0;
      
      // Log metrics about removed orphaned movies
      logger.trackDataCounts({
        stage: 'storage_updates_orphaned',
        movieCount: removedCount,
        source: 'database',
        details: {
          operation: 'remove_orphaned'
        }
      });
      
      logger.info(`Removed ${removedCount} orphaned movies`);
    } catch (error) {
      logger.error('Error removing orphaned movies:', error);
      throw error;
    } finally {
      orphanedSpan.finish();
    }
    
    // Execute other database updates with tracing
    const updatesSpan = transaction.startChild('execute_updates');
    try {
      logger.addBreadcrumb('storage_updates', 'Executing database updates');
      const updateResults = await executeUpdates() as unknown as UpdateOperationResult;
      
      // Log metrics about executed updates
      logger.trackDataCounts({
        stage: 'storage_updates_executed',
        movieCount: updateResults?.movieUpdates || 0,
        cinemaCount: updateResults?.cinemaUpdates || 0,
        showtimeCount: updateResults?.showtimeUpdates || 0,
        source: 'database',
        details: updateResults?.details || {}
      });
      
      logger.info('Successfully executed database updates');
    } catch (error) {
      logger.error('Error executing database updates:', error);
      throw error;
    } finally {
      updatesSpan.finish();
    }
    
    logger.info('Applied all database updates successfully');
  } catch (error) {
    logger.error('Error applying database updates:', error);
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Main function to process and store data
 */
async function main(): Promise<void> {
  // Create a main transaction for the entire storage process
  const mainTransaction = logger.startTransaction(
    'storage_main',
    'storage',
    { steps: steps.join(',') }
  );
  
  try {
    // Log initial data counts from the intermediate file
    logger.trackDataCounts({
      stage: 'storage_input',
      movieCount: intermediateObject.movies?.length || 0,
      cinemaCount: intermediateObject.cinemas?.length || 0,
      showtimeCount: intermediateObject.showtimes?.length || 0,
      source: 'intermediate_file'
    });
    
    logger.info(`Starting storage process with steps: ${steps.join(', ')}`);
    logger.addBreadcrumb('storage_config', 'Storage process configuration', {
      steps,
      timestamp: new Date().toISOString()
    });

    // Process each step sequentially to avoid database conflicts
    if (steps.includes('cinemas')) {
      const cinemaSpan = mainTransaction.startChild('insert_cinemas');
      try {
        logger.info('Inserting cinemas...');
        
        // Count cinemas before insertion to track duplication rate
        const preInsertionCount = intermediateObject.cinemas?.length || 0;
        
        // Insert cinemas into database
        const result = await insertCinemas(intermediateObject.cinemas) as unknown as StorageOperationResult;
        const insertedCount = result?.insertedCount || 0;
        const updatedCount = result?.updatedCount || 0;
        
        // Log metrics about cinema insertion
        logger.trackDataCounts({
          stage: 'storage_cinemas_inserted',
          cinemaCount: insertedCount,
          source: 'database',
          details: {
            totalCinemas: preInsertionCount,
            insertedCinemas: insertedCount,
            duplicates: preInsertionCount - insertedCount,
            duplicateRate: ((preInsertionCount - insertedCount) / preInsertionCount * 100).toFixed(2) + '%',
            updatedCount
          }
        });
        
        logger.info(`Inserted ${insertedCount} cinemas, updated ${updatedCount} existing cinemas`);
      } catch (error) {
        logger.error('Error inserting cinemas:', error);
        throw error;
      } finally {
        cinemaSpan.finish();
      }
    }

    if (steps.includes('movies')) {
      const movieSpan = mainTransaction.startChild('insert_movies');
      try {
        logger.info('Inserting movies...');
        
        // Count movies before insertion to track duplication rate
        const preInsertionCount = intermediateObject.movies?.length || 0;
        
        // Insert movies into database
        const result = await insertMovies(intermediateObject.movies) as unknown as StorageOperationResult;
        const insertedCount = result?.insertedCount || 0;
        const mergedCount = result?.mergedCount || 0;
        const updatedCount = result?.updatedCount || 0;
        
        // Log metrics about movie insertion
        logger.trackDataCounts({
          stage: 'storage_movies_inserted',
          movieCount: insertedCount,
          source: 'database',
          details: {
            totalMovies: preInsertionCount,
            insertedMovies: insertedCount,
            mergedMovies: mergedCount,
            updatedMovies: updatedCount,
            skippedDuplicates: preInsertionCount - insertedCount - mergedCount - updatedCount
          }
        });
        
        logger.info(`Inserted ${insertedCount} movies, merged ${mergedCount} duplicates, updated ${updatedCount} existing movies`);
      } catch (error) {
        logger.error('Error inserting movies:', error);
        throw error;
      } finally {
        movieSpan.finish();
      }
    }

    if (steps.includes('showtimes')) {
      const showtimeSpan = mainTransaction.startChild('insert_showtimes');
      try {
        logger.info('Inserting showtimes...');
        
        // Count showtimes before insertion
        const preInsertionCount = intermediateObject.showtimes?.length || 0;
        
        // Get distribution of unique movie and cinema IDs in showtimes
        const uniqueMovieIds = new Set(intermediateObject.showtimes?.map((s: any) => s.filmId) || []);
        const uniqueCinemaIds = new Set(intermediateObject.showtimes?.map((s: any) => s.cinemaId) || []);
        
        // Insert showtimes into database
        const result = await insertShowtimes(intermediateObject.showtimes) as unknown as StorageOperationResult;
        const insertedCount = result?.insertedCount || 0;
        const invalidCount = result?.invalidCount || 0;
        const missedReferences = result?.missedReferences || {};
        
        // Log metrics about showtime insertion
        logger.trackDataCounts({
          stage: 'storage_showtimes_inserted',
          showtimeCount: insertedCount,
          source: 'database',
          details: {
            totalShowtimes: preInsertionCount,
            uniqueMovies: uniqueMovieIds.size,
            uniqueCinemas: uniqueCinemaIds.size,
            insertedShowtimes: insertedCount,
            duplicates: preInsertionCount - insertedCount,
            duplicateRate: ((preInsertionCount - insertedCount) / preInsertionCount * 100).toFixed(2) + '%',
            invalidShowtimes: invalidCount,
            missedReferences
          }
        });
        
        logger.info(`Inserted ${insertedCount} showtimes, found ${preInsertionCount - insertedCount} duplicates, ${invalidCount} invalid entries`);
      } catch (error) {
        logger.error('Error inserting showtimes:', error);
        throw error;
      } finally {
        showtimeSpan.finish();
      }
    }

    if (steps.includes('updates')) {
      logger.info('Applying updates...');
      await applyUpdates();
    }

    // Get final database counts
    try {
      const { getCounts } = require('./scripts/storage/utils');
      const dbCounts = await getCounts() as unknown as DatabaseCounts;
      
      // Log final database counts after all operations
      logger.trackDataCounts({
        stage: 'storage_final_state',
        movieCount: dbCounts?.movies || 0,
        cinemaCount: dbCounts?.cinemas || 0,
        showtimeCount: dbCounts?.showtimes || 0,
        source: 'database_final'
      });
    } catch (error) {
      logger.error('Error getting final database counts:', error);
      // Don't throw here as we still want to report success
    }

    logger.info('Successfully inserted all data');
  } catch (error) {
    logger.error('Error in storage process:', error);
    Sentry.captureException(error);
    process.exit(1);
  } finally {
    mainTransaction.finish();
  }
}

// Execute the main function
main()
