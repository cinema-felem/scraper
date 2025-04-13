import { By, Builder, WebDriver, WebElement } from 'selenium-webdriver'

interface FilmgardeMovie {
  url?: string
  imageURL?: string
  title?: string
  genre?: string
  parentalRating?: string
  filmFormat?: string
}

/**
 * Scrapes movie data from Filmgarde Cineplex website
 * @returns {Promise<FilmgardeMovie[]>} List of movies
 * @throws {Error} When scraping fails
 */
export const filmgarde = async (): Promise<FilmgardeMovie[]> => {
  const movies: FilmgardeMovie[] = []
  let driver: WebDriver | null = null

  try {
    driver = await new Builder().forBrowser('chrome').build()
    await driver.get('https://fgcineplex.com.sg/movies')

    const revealed = await driver.findElement(By.id('revealed'))
    await driver.findElement(By.id('reveal')).click()
    // Wait for reveal animation to complete
    await driver.sleep(1000)

    const container = await driver.findElements(
      By.xpath(
        '///div[contains(@class, "tab-content nowshowing")]/div/div[contains(@class, "row")]/div[contains(@class, "col-md-3 col-sm-4 col-xs-6")]',
      ),
    )

    for (const element of container) {
      try {
        const movie: FilmgardeMovie = {}

        const imageWebElement = await element.findElement(
          By.xpath(
            '//div[contains(@class,"tour-img image")]/a/img[contains(@class,"movie-container")]',
          ),
        )

        movie.imageURL = await imageWebElement.getAttribute('src')
        console.log(movie.imageURL)

        // TODO: Extract other movie details
        // - Title
        // - Genre
        // - Parental Rating
        // - Film Format

        movies.push(movie)
      } catch (error) {
        console.error('Error processing movie element:', error)
      }
    }
  } catch (error) {
    console.error('Error scraping Filmgarde:', error)
  } finally {
    if (driver) {
      await driver.quit()
    }
  }

  return movies
}

// Only run if this file is executed directly
if (require.main === module) {
  filmgarde()
    .then(movies => {
      console.log(`Found ${movies.length} movies`)
    })
    .catch(console.error)
}
