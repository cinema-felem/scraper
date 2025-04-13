import { promises as fs, mkdirSync } from 'fs'
import * as path from 'path'
import 'chromedriver'
import { EventEmitter } from 'events'
import logger, { initSentry, DataCountMetrics } from './utils/logger'
import * as Cathay from './scripts/scrape/cathay'
import * as GV from './scripts/scrape/gv'
import * as Projector from './scripts/scrape/projector'
import * as Shaw from './scripts/scrape/shaw'

// Increase event listener limit
EventEmitter.defaultMaxListeners = 20

// Initialize Sentry for error tracking with centralized logger
initSentry({
  tracesSampleRate: 1.0,
  // Add metadata about this service
  initialScope: {
    tags: {
      service: 'scraper'
    }
  }
})

/**
 * Define available cinema chains
 */
type CinemaChain = 'cathay' | 'gv' | 'projector' | 'shaw'
const DEFAULT_CINEMA_CHAINS: CinemaChain[] = [
  'cathay',
  'gv',
  'projector',
  'shaw',
]

/**
 * Configure which cinema chains to scrape based on command line arguments
 */
let cinemaChains = [...DEFAULT_CINEMA_CHAINS]
if (process.argv[2]) {
  cinemaChains = [process.argv[2] as CinemaChain]
}

/**
 * Ensure raw data directory exists
 */
mkdirSync('data/raw/', { recursive: true })

/**
 * Scrape data from a specific cinema chain
 * @param cinemaChain The cinema chain to scrape
 * @returns {Promise<void>} Promise that resolves when scraping is complete
 * @throws {ScraperError} When scraping fails
 */
async function scrapeChain(cinemaChain: CinemaChain): Promise<void> {
  // Create a transaction for this scrape operation
  const transaction = logger.startTransaction(
    `scrape_${cinemaChain}`,
    'scrape',
    { cinemaChain }
  );
  
  try {
    logger.info(`Starting scrape for ${cinemaChain}...`);
    logger.addBreadcrumb('scraper', `Starting scrape for ${cinemaChain}`);

    // Map cinema chain to the appropriate module
    const scraperModules: Record<CinemaChain, any> = {
      cathay: Cathay,
      gv: GV,
      projector: Projector,
      shaw: Shaw,
    };

    // Get the appropriate scraper module
    const scraperModule = scraperModules[cinemaChain];

    if (!scraperModule) {
      throw new Error(`No scraper module found for ${cinemaChain}`);
    }

    // Define types for the scraper functions
    type ScraperFunction<T> = () => Promise<T[]>;

    // Destructure with default empty functions in case methods are missing
    const fetchMovies: ScraperFunction<any> =
      scraperModule.fetchMovies || (async () => []);
    const fetchCinemas: ScraperFunction<any> =
      scraperModule.fetchCinemas || (async () => []);
    const fetchShowtimes: ScraperFunction<any> =
      scraperModule.fetchShowtimes || (async () => []);

    // Fetch movies with tracing
    const moviesSpan = transaction.startChild(`fetch_movies_${cinemaChain}`);
    logger.info(`${cinemaChain}: Fetching movies...`);
    let movies: any[] = [];
    try {
      movies = await fetchMovies();
      // Log movie count metric
      logger.trackDataCounts({
        stage: 'scrape_movies',
        movieCount: movies.length,
        source: cinemaChain,
        details: { movieIds: movies.map(m => m.id || 'unknown') }
      });
    } catch (error) {
      logger.error(`Error fetching movies for ${cinemaChain}:`, error);
    } finally {
      moviesSpan.finish();
    }

    // Fetch cinemas with tracing
    const cinemasSpan = transaction.startChild(`fetch_cinemas_${cinemaChain}`);
    logger.info(`${cinemaChain}: Fetching cinemas...`);
    let cinemas: any[] = [];
    try {
      cinemas = await fetchCinemas();
      // Log cinema count metric
      logger.trackDataCounts({
        stage: 'scrape_cinemas',
        cinemaCount: cinemas.length,
        source: cinemaChain,
        details: { cinemaIds: cinemas.map(c => c.id || 'unknown') }
      });
    } catch (error) {
      logger.error(`Error fetching cinemas for ${cinemaChain}:`, error);
    } finally {
      cinemasSpan.finish();
    }

    // Fetch showtimes with tracing
    const showtimesSpan = transaction.startChild(`fetch_showtimes_${cinemaChain}`);
    logger.info(`${cinemaChain}: Fetching showtimes...`);
    let showtimes: any[] = [];
    try {
      showtimes = await fetchShowtimes();
      // Log showtime count metric
      logger.trackDataCounts({
        stage: 'scrape_showtimes',
        showtimeCount: showtimes.length,
        source: cinemaChain,
        details: {
          uniqueMovieIds: [...new Set(showtimes.map(s => s.filmId || 'unknown'))].length,
          uniqueCinemaIds: [...new Set(showtimes.map(s => s.cinemaId || 'unknown'))].length,
          dateRange: getShowtimeDateRange(showtimes)
        }
      });
    } catch (error) {
      logger.error(`Error fetching showtimes for ${cinemaChain}:`, error);
    } finally {
      showtimesSpan.finish();
    }

    // Track combined metrics for this cinema chain
    logger.trackDataCounts({
      stage: 'scrape_complete',
      movieCount: movies.length,
      cinemaCount: cinemas.length,
      showtimeCount: showtimes.length,
      source: cinemaChain
    });

    // Write data to file with tracing
    const writeSpan = transaction.startChild(`write_data_${cinemaChain}`);
    try {
      const outputPath = path.join('data/raw', `${cinemaChain}.json`);
      const output = JSON.stringify({ movies, cinemas, showtimes }, null, 2);
      await fs.writeFile(outputPath, output, 'utf8');
      logger.addBreadcrumb('file_operation', `Wrote ${cinemaChain} data to ${outputPath}`, {
        movieCount: movies.length,
        cinemaCount: cinemas.length,
        showtimeCount: showtimes.length,
        fileSize: output.length
      });
    } catch (error) {
      logger.error(`Error writing data for ${cinemaChain}:`, error);
    } finally {
      writeSpan.finish();
    }

    logger.info(`Successfully scraped ${cinemaChain} data`);
  } catch (error) {
    logger.error(`Error scraping ${cinemaChain}:`, error);
  } finally {
    // Finish the transaction
    transaction.finish();
  }
}

/**
 * Helper function to extract date range from showtimes
 * @param showtimes Array of showtimes
 * @returns Object with earliest and latest dates
 */
function getShowtimeDateRange(showtimes: any[]): { earliest: string; latest: string } {
  try {
    if (!showtimes.length) return { earliest: 'unknown', latest: 'unknown' };
    
    const dates = showtimes
      .map(s => s.date || s.showtime?.date || s.showDate || '')
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()));
    
    if (!dates.length) return { earliest: 'unknown', latest: 'unknown' };
    
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      earliest: earliest.toISOString().split('T')[0],
      latest: latest.toISOString().split('T')[0]
    };
  } catch (e) {
    return { earliest: 'error', latest: 'error' };
  }
}

/**
 * Main function to scrape all cinema chains
 * Runs scrapers sequentially to prevent multiple Selenium instances
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  // Create a main transaction for the entire scrape process
  const mainTransaction = logger.startTransaction(
    'scrape_all_cinemas',
    'scrape',
    { cinemaChains: cinemaChains.join(',') }
  );
  
  try {
    logger.info(`Starting scrape process for: ${cinemaChains.join(', ')}`);
    
    // Track which cinema chains we're scraping
    logger.addBreadcrumb('scrape_config', 'Cinema chains configuration', {
      chains: cinemaChains,
      total: cinemaChains.length,
      timestamp: new Date().toISOString()
    });

    // Process each cinema chain sequentially
    for (const chain of cinemaChains) {
      await scrapeChain(chain);
      // Add a small delay between chains to ensure clean browser shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    logger.info('Successfully completed all scraping tasks');
  } catch (error) {
    logger.error('Error in scraping process:', error);
    process.exit(1);
  } finally {
    mainTransaction.finish();
  }
}

// Execute the main function
main()
