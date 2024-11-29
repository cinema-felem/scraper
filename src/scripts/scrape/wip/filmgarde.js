

const {
  By,
  Builder,
  Browser,
  WebDriverWait,
  Duration,
  WebElement,
} = require("selenium-webdriver");

const filmgarde = async () => {
    const movies = [];
    const driver = await new Builder().forBrowser('chrome').build();
    await driver.get('https://fgcineplex.com.sg/movies');
    
    const revealed = driver.findElement(By.id("revealed"));
    Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(2));
    driver.findElement(By.id("reveal")).click();
    wait.until(d -> !revealed.isDisplayed());

    // const container = await driver.findElements(By.xpath('/html/body/div[contains(@class,"bgimagetrbfgh container container2")]/section[contains(@class, "now-showing-area movie-listing")]/div[contains(@class, "container p-0")]/div[contains(@class, "row")]/div[contains(@class, "col-md-12")]/div[contains(@class, "booking-from")]/div[contains(@class, "tab-content nowshowing")]/div/div[contains(@class, "row")]/div[contains(@class, "col-md-3 col-sm-4 col-xs-6")]'));
    const container = await driver.findElements(By.xpath('///div[contains(@class, "tab-content nowshowing")]/div/div[contains(@class, "row")]/div[contains(@class, "col-md-3 col-sm-4 col-xs-6")]'));
    // const container = await driver.findElements(By.xpath('//*[@id="tab1"]/div[contains(@class,"z-50 w-full")]/span/div[contains(@class,"movie-container")]'));
    container.forEach(async (element)=> {
        // const container = await element.findElement(By.xpath('//*[@id="tab1"]/div[contains(@class,"z-50 w-full")]/span/div[contains(@class,"movie-container")]'));
        const imageWebElement = await element.findElement(By.xpath('//div[contains(@class,"tour-img image")]/a/img[contains(@class,"movie-container")]'));
        // const movieURLWebElement = element.findElement(By.css('a'));
        const imageURL = await imageWebElement.getAttribute("src");
        console.log(imageURL)
    //     const movieDetailsWebElement = await element.findElement(By.xpath('a/div/div[contains(@class,"flex items-center")]'));
    //     const titleWebElement = movieDetailsWebElement.findElement(By.xpath('div[contains(@class,"text-[#43b8ff]")]'));
    //     const title = await titleWebElement.getText();
    //     const infoWebElement = await movieDetailsWebElement.findElement(By.xpath('div[contains(@class,"lg:block flex flex-col w-full")]'));
    //     const genreWebElement = infoWebElement.findElement(By.css('div'));
    //     const genre = await genreWebElement.getText();
    //     const ParentalRatingWebElement = infoWebElement.findElement(By.xpath('div[2]'));
    //     const parentalRating = await ParentalRatingWebElement.getText();
    //     const filmFormatWebElement = infoWebElement.findElement(By.xpath('div[3]'));
    //     const filmFormat = await filmFormatWebElement.getText();
    //     movies.push({
    //         url: movieURL,
    //         title,
    //         genre,
    //         parentalRating,
    //         filmFormat,
    //     })
    })
    // await driver.quit();
    // return movies;
}
filmgarde();