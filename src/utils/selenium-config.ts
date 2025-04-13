/**
 * Selenium WebDriver configuration utilities
 * Provides standardized browser configuration for scrapers
 */
import { Builder, WebDriver } from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Creates a unique temporary directory for Chrome user data
 * @returns {string} Path to the unique temporary directory
 */
const createUniqueTempDir = (): string => {
  const tempDir = path.join(process.cwd(), 'temp', 'chrome-data')

  // Create the base temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  // Create a unique subdirectory using timestamp and random string
  const uniqueId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`
  const uniqueTempDir = path.join(tempDir, uniqueId)
  fs.mkdirSync(uniqueTempDir, { recursive: true })

  return uniqueTempDir
}

/**
 * Creates a WebDriver instance with standardized Chrome options
 * Configures Chrome to run headless in CI environments with unique user data directory
 * @returns {Promise<WebDriver>} Configured WebDriver instance
 * @throws {Error} When browser creation fails
 */
export const createChromeDriver = async (): Promise<WebDriver> => {
  try {
    const options = new Options()

    // Set unique user data directory to prevent conflicts
    const userDataDir = createUniqueTempDir()
    options.addArguments(`--user-data-dir=${userDataDir}`)

    // Add CI-friendly options
    options.addArguments('--no-sandbox')
    options.addArguments('--disable-dev-shm-usage')
    options.addArguments('--disable-gpu')
    options.addArguments('--disable-extensions')

    // Run headless in CI environments
    if (process.env.CI === 'true') {
      options.addArguments('--headless')
    }

    // Create and return the WebDriver
    return await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build()
  } catch (error) {
    console.error('Failed to create Chrome WebDriver:', error)
    throw new Error(`Chrome WebDriver creation failed: ${error.message}`)
  }
}

/**
 * Safely quits a WebDriver instance
 * @param {WebDriver} driver The WebDriver instance to quit
 * @returns {Promise<void>}
 */
export const safeQuitDriver = async (driver: WebDriver): Promise<void> => {
  if (driver) {
    try {
      await driver.quit()
    } catch (error) {
      console.error('Error quitting WebDriver:', error)
    }
  }
}
