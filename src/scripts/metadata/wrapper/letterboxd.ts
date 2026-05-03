import { Browser } from 'playwright'
import { MovieRatings } from './tmdb'
import { createPlaywrightSession, closePlaywrightSession } from '../../../utils/playwright-config'
import logger from '../../../utils/logger'

/**
 * Retrieves movie ratings from Letterboxd using TMDB ID
 * @param {number} tmdbId - The TMDB ID of the movie
 * @returns {Promise<MovieRatings>} Movie rating information from Letterboxd
 * @throws {Error} When scraping fails or movie is not found
 */
export const lookupRatingsOnLetterboxd = async (
  tmdbId: string,
): Promise<MovieRatings | null> => {
  if (!tmdbId) {
    logger.warn('No TMDB ID provided for Letterboxd rating lookup')
    return null
  }

  let browser: Browser | null = null

  try {
    const { browser: b, page } = await createPlaywrightSession()
    browser = b

    logger.info(`Navigating to Letterboxd page for TMDB ID ${tmdbId}`)
    await page.goto(`https://letterboxd.com/tmdb/${tmdbId}`)

    // Wait for page to load and check for 404
    await page.waitForLoadState('domcontentloaded')
    const pageTitle = await page.title()

    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      logger.warn(`Movie with TMDB ID ${tmdbId} not found on Letterboxd`)
      return null
    }

    try {
      const ratingEl = await page.waitForSelector('span.average-rating > a', { timeout: 30000 })
      const rating = ratingEl ? await ratingEl.textContent() : null

      if (!rating) return null

      return {
        source: 'Letterboxd',
        rating: parseFloat(rating) * 2,
      }
    } catch (error) {
      logger.error(
        `Error extracting Letterboxd data for TMDB ID ${tmdbId}:`,
        error,
      )
      return null
    }
  } catch (error) {
    logger.error(
      `Error retrieving Letterboxd ratings for TMDB ID ${tmdbId}:`,
      error,
    )
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`)
      logger.error(`Error stack: ${error.stack}`)
    }
    return null
  } finally {
    if (browser) {
      logger.info(`Closing browser for TMDB ID ${tmdbId}`)
      await closePlaywrightSession(browser)
    }
  }
}
