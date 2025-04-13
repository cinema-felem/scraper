import { By, WebDriver, until } from 'selenium-webdriver'
import { MovieRatings } from './tmdb'
import {
  createChromeDriver,
  safeQuitDriver,
} from '../../../utils/selenium-config'
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

  let driver: WebDriver | null = null

  try {
    // Use the shared Chrome driver configuration
    driver = await createChromeDriver()

    // Navigate to the Letterboxd page for this TMDB ID
    logger.info(`Navigating to Letterboxd page for TMDB ID ${tmdbId}`)
    await driver.get(`https://letterboxd.com/tmdb/${tmdbId}`)

    // Wait for page to load completely
    await driver.wait(until.elementLocated(By.css('body')), 10000)

    // Check if the movie exists on Letterboxd by waiting for title to load
    await driver.wait(until.titleMatches(/.*Letterboxd/), 5000)
    const pageTitle = await driver.getTitle()

    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      logger.warn(`Movie with TMDB ID ${tmdbId} not found on Letterboxd`)
      return null
    }

    // Wait for the page content to be fully loaded
    try {
      // Find the rating element with explicit wait
      const ratingContainer = await driver.wait(
        until.elementLocated(By.css('span.average-rating > a')),
        30000,
        'Timed out waiting for rating element to appear',
      )

      const rating = await ratingContainer.getText()
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
    // Provide more detailed error information for debugging
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`)
      logger.error(`Error stack: ${error.stack}`)
    }
    return null
  } finally {
    // Ensure the driver is properly closed
    if (driver) {
      logger.info(`Closing browser for TMDB ID ${tmdbId}`)
      await safeQuitDriver(driver)
    }
  }
}
