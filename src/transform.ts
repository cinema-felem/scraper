import { promises as fs, mkdirSync } from 'fs'
import { EventEmitter } from 'events'
import {
  StandardCinema,
  StandardMovie,
  StandardShowtime,
} from './types/standard'
import * as path from 'path'
import logger, { initSentry, DataCountMetrics } from './utils/logger'

// Increase event listener limit
EventEmitter.defaultMaxListeners = 20

// Initialize Sentry for error tracking with centralized logger
initSentry({
  tracesSampleRate: 1.0,
  // Add metadata about this service
  initialScope: {
    tags: {
      service: 'transformer'
    }
  }
})

/**
 * Data structure for cinema, movie, and showtime collections
 */
interface CinemaData {
  movies: StandardMovie[]
  cinemas: StandardCinema[]
  showtimes: StandardShowtime[]
}

// Configure cinema chains to process
const DEFAULT_CINEMA_CHAINS = ['gv', 'shaw']
let cinemaChains = [...DEFAULT_CINEMA_CHAINS]
let singleChainMode = false

// Process command line arguments
if (process.argv[2]) {
  cinemaChains = [process.argv[2]]
  singleChainMode = true
}

/**
 * Initialize merged data structure
 */
const merged: CinemaData = {
  movies: [],
  cinemas: [],
  showtimes: [],
}

// Ensure data directories exist
mkdirSync('data/intermediate/', { recursive: true })
mkdirSync('data/permutation/', { recursive: true })

// const generatePermutations = everything => {
//   const subObject = ['movies', 'showtimes', 'cinemas']
//   const finalObject = {}

//   const generatePermutationsResult = showtimeArray => {
//     const attributesSetObject = {}

//     for (const showtime of showtimeArray) {
//       Object.keys(showtime).forEach(key => {
//         if (typeof attributesSetObject[key] === 'undefined') {
//           attributesSetObject[key] = new Set()
//         }
//         attributesSetObject[key].add(showtime[key])
//       })
//     }

//     const attributesArrayObject = {}
//     Object.keys(attributesSetObject).forEach(key => {
//       attributesArrayObject[key] = Array.from(attributesSetObject[key])
//     })

//     return attributesArrayObject
//   }
//   for (const sub of subObject) {
//     finalObject[sub] = generatePermutationsResult(everything[sub])
//   }
//   return finalObject
// }

/**
 * Process each cinema chain's data
 */
async function processAllCinemaChains(): Promise<void> {
  // Create a transaction for the transformation process
  const transaction = logger.startTransaction(
    'transform_all_cinemas',
    'transform',
    { cinemaChains: cinemaChains.join(',') }
  );
  
  try {
    logger.addBreadcrumb('transform_config', 'Starting transformation process', {
      chains: cinemaChains,
      total: cinemaChains.length,
      timestamp: new Date().toISOString()
    });
    
    for (const cinemaChain of cinemaChains) {
      logger.info(`Processing transform for ${cinemaChain}`);
      
      try {
        // Import the standardization module for this cinema chain
        const importSpan = transaction.startChild({
          op: `import_module_${cinemaChain}`,
          description: `Import transform module for ${cinemaChain}`
        });
        let standardiseCinemaChain;
        try {
          const module = require(path.join('../dist/scripts/transform/', cinemaChain));
          standardiseCinemaChain = module.standardiseCinemaChain;
          logger.addBreadcrumb('module_load', `Loaded transform module for ${cinemaChain}`);
        } catch (err) {
          logger.error(`Error loading transform module for ${cinemaChain}:`, err);
          throw err;
        } finally {
          importSpan.finish();
        }

        // Read raw data
        const readSpan = transaction.startChild({
          op: `read_raw_data_${cinemaChain}`,
          description: `Read raw data for ${cinemaChain}`
        });
        let cinemaChainObject;
        try {
          const rawDataPath = path.join('data/raw', `${cinemaChain}.json`);
          const cinemaChainText = await fs.readFile(rawDataPath, 'utf8');
          cinemaChainObject = JSON.parse(cinemaChainText);
          
          // Log raw data metrics
          logger.trackDataCounts({
            stage: 'transform_raw_input',
            movieCount: cinemaChainObject.movies?.length || 0,
            cinemaCount: cinemaChainObject.cinemas?.length || 0,
            showtimeCount: cinemaChainObject.showtimes?.length || 0,
            source: cinemaChain
          });
          
          logger.addBreadcrumb('file_read', `Read raw data for ${cinemaChain}`, {
            path: rawDataPath,
            size: cinemaChainText.length
          });
        } catch (err) {
          logger.error(`Error reading raw data for ${cinemaChain}:`, err);
          throw err;
        } finally {
          readSpan.finish();
        }

        // Standardize the data
        const standardizeSpan = transaction.startChild({
          op: `standardize_${cinemaChain}`,
          description: `Standardize data for ${cinemaChain}`
        });
        let standardizedData;
        try {
          standardizedData = standardiseCinemaChain(cinemaChainObject);
          
          // Log standardized data metrics
          logger.trackDataCounts({
            stage: 'transform_standardized',
            movieCount: standardizedData.movies?.length || 0,
            cinemaCount: standardizedData.cinemas?.length || 0,
            showtimeCount: standardizedData.showtimes?.length || 0,
            source: cinemaChain,
            details: {
              uniqueMovieIds: [...new Set(standardizedData.movies?.map((m: StandardMovie) => m.id) || [])].length,
              uniqueCinemaIds: [...new Set(standardizedData.cinemas?.map((c: StandardCinema) => c.id) || [])].length
            }
          });
        } catch (err) {
          logger.error(`Error standardizing data for ${cinemaChain}:`, err);
          throw err;
        } finally {
          standardizeSpan.finish();
        }

        // Write intermediate data
        const writeSpan = transaction.startChild({
          op: `write_intermediate_${cinemaChain}`,
          description: `Write intermediate data for ${cinemaChain}`
        });
        try {
          const outputPath = path.join('data/intermediate', `${cinemaChain}.json`);
          const output = JSON.stringify(standardizedData, null, 2);
          await fs.writeFile(outputPath, output, 'utf8');
          
          logger.addBreadcrumb('file_write', `Wrote intermediate data for ${cinemaChain}`, {
            path: outputPath,
            size: output.length
          });
        } catch (err) {
          logger.error(`Error writing intermediate data for ${cinemaChain}:`, err);
          throw err;
        } finally {
          writeSpan.finish();
        }

        // Merge with existing data
        const mergeSpan = transaction.startChild({
          op: `merge_${cinemaChain}`,
          description: `Merge data for ${cinemaChain}`
        });
        try {
          // Record pre-merge counts
          const preMergeMovies = merged.movies.length;
          const preMergeCinemas = merged.cinemas.length;
          const preMergeShowtimes = merged.showtimes.length;
          
          merged.movies = merged.movies.concat(standardizedData.movies);
          merged.cinemas = merged.cinemas.concat(standardizedData.cinemas);
          merged.showtimes = merged.showtimes.concat(standardizedData.showtimes);
          
          // Log merge metrics
          logger.trackDataCounts({
            stage: 'transform_merge',
            movieCount: merged.movies.length,
            cinemaCount: merged.cinemas.length,
            showtimeCount: merged.showtimes.length,
            source: 'merged',
            details: {
              addedMovies: merged.movies.length - preMergeMovies,
              addedCinemas: merged.cinemas.length - preMergeCinemas,
              addedShowtimes: merged.showtimes.length - preMergeShowtimes
            }
          });
        } catch (err) {
          logger.error(`Error merging data for ${cinemaChain}:`, err);
          throw err;
        } finally {
          mergeSpan.finish();
        }

        logger.info(`Successfully processed ${cinemaChain} data`);
      } catch (error) {
        logger.error(`Error processing ${cinemaChain}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error in transformation process:', error);
  } finally {
    transaction.finish();
  }
}

/**
 * Filter movies to only include those referenced by showtimes
 * @param data The cinema data to clean
 * @returns Cleaned cinema data with unused movies removed
 */
function cleanMovieList(data: CinemaData): CinemaData {
  const { movies, cinemas, showtimes } = data;
  
  // Create a span for the cleaning process
  const span = logger.startTransaction(
    'clean_movie_list',
    'transform',
    { totalMovies: movies.length, totalShowtimes: showtimes.length }
  );
  
  try {
    // Log input metrics
    logger.trackDataCounts({
      stage: 'clean_input',
      movieCount: movies.length,
      cinemaCount: cinemas.length,
      showtimeCount: showtimes.length,
      source: 'merged'
    });
    
    // Create a set of movie IDs that are referenced by showtimes
    const usedMovieIds = new Set<string>();
    for (const showtime of showtimes) {
      usedMovieIds.add(showtime.filmId);
    }
    
    logger.addBreadcrumb('data_cleaning', 'Created set of used movie IDs', {
      totalUniqueMovieIds: usedMovieIds.size,
      totalShowtimes: showtimes.length
    });
    
    // Filter movies to only include those that are used in showtimes
    const filteredMovies = movies.filter((movie: StandardMovie) =>
      usedMovieIds.has(movie.id)
    );
    
    // Log metrics about unused movies
    const unusedMovies = movies.length - filteredMovies.length;
    logger.trackDataCounts({
      stage: 'clean_output',
      movieCount: filteredMovies.length,
      cinemaCount: cinemas.length,
      showtimeCount: showtimes.length,
      source: 'cleaned',
      details: {
        unusedMovies,
        unusedMoviesPercentage: (unusedMovies / movies.length * 100).toFixed(2) + '%',
        usedMovieIdsCount: usedMovieIds.size
      }
    });
    
    return {
      movies: filteredMovies,
      cinemas,
      showtimes,
    };
  } catch (error) {
    logger.error('Error cleaning movie list:', error);
    throw error;
  } finally {
    span.finish();
  }
}

/**
 * Main function to process and save cinema data
 */
async function main(): Promise<void> {
  // Create a main transaction for the entire process
  const mainTransaction = logger.startTransaction(
    'transform_main',
    'transform',
    { singleChainMode }
  );
  
  try {
    logger.info('Starting transformation process');
    await processAllCinemaChains();

    // Only clean and merge data if not in single chain mode
    if (!singleChainMode) {
      const mergeSpan = mainTransaction.startChild({
        op: 'finalize_merged_data',
        description: 'Finalize and write merged data'
      });
      try {
        // Log pre-cleaning metrics
        logger.trackDataCounts({
          stage: 'pre_cleaning',
          movieCount: merged.movies.length,
          cinemaCount: merged.cinemas.length,
          showtimeCount: merged.showtimes.length,
          source: 'merged'
        });
        
        const cleanedData = cleanMovieList(merged);
        
        // Write merged data to file
        const mergedDataPath = path.join('data/intermediate', 'merge.json');
        const transformedJSON = JSON.stringify(cleanedData, null, 2);
        await fs.writeFile(mergedDataPath, transformedJSON, 'utf8');
        
        logger.addBreadcrumb('file_operation', 'Wrote merged data to file', {
          path: mergedDataPath,
          size: transformedJSON.length,
          movies: cleanedData.movies.length,
          cinemas: cleanedData.cinemas.length,
          showtimes: cleanedData.showtimes.length
        });
        
        logger.info('Successfully merged and cleaned all cinema data');
        
        // Log final output metrics
        logger.trackDataCounts({
          stage: 'transform_final_output',
          movieCount: cleanedData.movies.length,
          cinemaCount: cleanedData.cinemas.length,
          showtimeCount: cleanedData.showtimes.length,
          source: 'final'
        });
      } catch (error) {
        logger.error('Error finalizing merged data:', error);
        throw error;
      } finally {
        mergeSpan.finish();
      }
    } else {
      logger.info('Skipping merge step due to single chain mode');
    }
    
    logger.info('Transform process completed successfully');
  } catch (error) {
    logger.error('Error in transform process:', error);
    process.exit(1);
  } finally {
    mainTransaction.finish();
  }
}

// Execute the main function
main()
