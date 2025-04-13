import { promises as fs, mkdirSync } from 'fs'
import { EventEmitter } from 'events'
import * as path from 'path'
import * as Sentry from '@sentry/node'
import { lookupMovies } from './scripts/metadata/movies'
import { contextualiseCinema } from './scripts/metadata/cinemas'
import logger, { initSentry, DataCountMetrics } from './utils/logger'

/**
 * Metadata processing script for cinema data
 * Handles enrichment of movie and cinema data with external metadata
 */

// Increase event listener limit
EventEmitter.defaultMaxListeners = 20

// Initialize Sentry for error tracking with centralized logger
initSentry({
  tracesSampleRate: 1.0,
  // Add metadata about this service
  initialScope: {
    tags: {
      service: 'metadata',
    },
  },
})

// Ensure metadata directory exists
mkdirSync('data/metadata/', { recursive: true })

/**
 * Possible metadata processing steps
 */
type MetadataStep = 'cinemas' | 'movies'

/**
 * Process movie metadata
 * Fetches additional movie information and saves to JSON
 */
async function processMovieMetadata(): Promise<void> {
  // Create a transaction for movie metadata processing
  const transaction = logger.startTransaction(
    'process_movie_metadata',
    'metadata',
    { source: 'movies' }
  );
  
  try {
    logger.info('Processing movie metadata...');
    
    // Create a span for fetching movie metadata
    const lookupSpan = transaction.startChild({
      op: 'lookup_movies',
      description: 'Fetch and process movie metadata'
    });
    let movies = [];
    try {
      // Log the start of the movie lookup process
      logger.addBreadcrumb('metadata', 'Starting movie metadata lookup');
      
      // Fetch movie metadata
      movies = await lookupMovies();
      
      // Log metrics about the movie metadata
      logger.trackDataCounts({
        stage: 'metadata_movies_fetched',
        movieCount: movies.length,
        source: 'external_apis',
        details: {
          moviesWithRatings: movies.filter((m: any) => m.ratings && m.ratings.length > 0).length,
          moviesWithPosters: movies.filter((m: any) => m.poster).length,
          moviesWithTMDb: movies.filter((m: any) => m.tmdbId).length,
          ratingSources: getUniqueSources(movies)
        }
      });
    } catch (error) {
      logger.error('Error fetching movie metadata:', error);
      throw error;
    } finally {
      lookupSpan.finish();
    }
    
    // Create a span for writing movie metadata to file
    const writeSpan = transaction.startChild({
      op: 'write_movie_metadata',
      description: 'Write movie metadata to file'
    });
    try {
      const movieOutput = JSON.stringify({ movies }, null, 2);
      const outputPath = path.join('data/metadata', 'movies.json');
      await fs.writeFile(outputPath, movieOutput, 'utf8');
      
      // Log file write operation
      logger.addBreadcrumb('file_operation', 'Wrote movie metadata to file', {
        path: outputPath,
        size: movieOutput.length,
        movieCount: movies.length
      });
    } catch (error) {
      logger.error('Error writing movie metadata to file:', error);
      throw error;
    } finally {
      writeSpan.finish();
    }
    
    // Log successful completion
    logger.info(`Successfully processed metadata for ${movies.length} movies`);
  } catch (error) {
    logger.error('Error processing movie metadata:', error);
    throw error; // Re-throw to be caught by main error handler
  } finally {
    transaction.finish();
  }
}

/**
 * Process cinema metadata
 * Enriches cinema data with location information
 */
async function processCinemaMetadata(): Promise<void> {
  // Create a transaction for cinema metadata processing
  const transaction = logger.startTransaction(
    'process_cinema_metadata',
    'metadata',
    { source: 'cinemas' }
  );
  
  try {
    logger.info('Processing cinema metadata...');
    
    // Create a span for contextualizing cinemas
    const contextualizeSpan = transaction.startChild({
      op: 'contextualize_cinemas',
      description: 'Enrich cinemas with location data'
    });
    try {
      // Log the start of the cinema contextualization process
      logger.addBreadcrumb('metadata', 'Starting cinema contextualization');
      
      // Get the original cinema count to compare after contextualization
      let cinemaCount = 0;
      try {
        const intermediateDataPath = path.join('data/intermediate', 'merge.json');
        const dataStr = await fs.readFile(intermediateDataPath, 'utf8');
        const data = JSON.parse(dataStr);
        cinemaCount = data.cinemas?.length || 0;
        
        // Log initial cinema count
        logger.trackDataCounts({
          stage: 'metadata_cinemas_input',
          cinemaCount,
          source: 'merge_file'
        });
      } catch (error) {
        logger.error('Error reading intermediate cinema data:', error);
        // Continue with process even if we can't read the original count
      }
      
      // Contextualize cinemas (enrich with location data)
      await contextualiseCinema();
      
      // Try to read the results to log metrics
      try {
        const metadataPath = path.join('data/metadata', 'cinemas.json');
        const metadataStr = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataStr);
        const enrichedCount = metadata.cinemas?.length || 0;
        
        // Log metrics about the cinema metadata
        logger.trackDataCounts({
          stage: 'metadata_cinemas_enriched',
          cinemaCount: enrichedCount,
          source: 'external_apis',
          details: {
            cinemasWithCoordinates: metadata.cinemas?.filter((c: any) => c.lat && c.lng).length || 0,
            cinemasWithAddress: metadata.cinemas?.filter((c: any) => c.address).length || 0,
            originalCount: cinemaCount,
            enrichmentRate: ((enrichedCount / cinemaCount) * 100).toFixed(2) + '%'
          }
        });
      } catch (error) {
        logger.error('Error reading enriched cinema metadata:', error);
        // Don't throw here, as the main contextualization might have still succeeded
      }
    } catch (error) {
      logger.error('Error contextualizing cinemas:', error);
      throw error;
    } finally {
      contextualizeSpan.finish();
    }
    
    // Log successful completion
    logger.info('Successfully processed cinema metadata');
  } catch (error) {
    logger.error('Error processing cinema metadata:', error);
    throw error; // Re-throw to be caught by main error handler
  } finally {
    transaction.finish();
  }
}

/**
 * Helper function to get unique rating sources from movies
 */
function getUniqueSources(movies: any[]): Record<string, number> {
  const sources: Record<string, number> = {};
  
  try {
    for (const movie of movies) {
      if (movie.ratings && Array.isArray(movie.ratings)) {
        for (const rating of movie.ratings) {
          if (rating.source) {
            if (!sources[rating.source]) {
              sources[rating.source] = 0;
            }
            sources[rating.source]++;
          }
        }
      }
    }
  } catch (e) {
    logger.error('Error extracting rating sources:', e);
  }
  
  return sources;
}

/**
 * Main function to process metadata
 */
async function main(): Promise<void> {
  // Create a main transaction for the entire metadata process
  const mainTransaction = logger.startTransaction(
    'metadata_main',
    'metadata',
    { pid: process.pid }
  );
  
  try {
    // Determine which steps to run based on command line arguments
    const steps: MetadataStep[] = process.argv[2]
      ? [process.argv[2] as MetadataStep]
      : ['cinemas', 'movies'];

    logger.info(`Starting metadata process with steps: ${steps.join(', ')}`);
    
    // Log configuration information
    logger.addBreadcrumb('metadata_config', 'Metadata processing configuration', {
      steps,
      timestamp: new Date().toISOString()
    });

    // Track tasks sequentially to ensure better tracing
    // This allows us to more easily identify where data drops out
    if (steps.includes('movies')) {
      await processMovieMetadata();
    }

    if (steps.includes('cinemas')) {
      await processCinemaMetadata();
    }

    logger.info('Successfully completed all metadata processing');
  } catch (error) {
    logger.error('Error in metadata process:', error);
    Sentry.captureException(error);
    process.exit(1);
  } finally {
    mainTransaction.finish();
  }
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled error in metadata process:', error)
  Sentry.captureException(error)
  process.exit(1)
})
