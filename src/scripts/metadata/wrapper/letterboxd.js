const { By, Builder } = require('selenium-webdriver')
const lookupRatingsOnLetterboxd = async tmdbId => {
  if (!tmdbId) {
    return
  }

  const driver = await new Builder().forBrowser('chrome').build()
  await driver.get(`https://letterboxd.com/imdb/tt0111161`)
  // driver.manage().setTimeouts({ implicit: 1000 })
  const element = driver.findElement(By.css('div'))
  // console.log(await element.getText())
  // const ratingContainer = await driver.findElement(
  //   By.css('span.average-rating > a'),
  // )
  // console.log(ratingContainer)

  // const ratingString = await ratingContainer.getAttribute('data-original-title')

  // console.log('rating string')

  // const ratingString = await ratingContainer.getAttribute('data-original-title')
  // console.log(ratingString)
  await driver.quit()
  // return movies
}

module.exports = { lookupRatingsOnLetterboxd }
