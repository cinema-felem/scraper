require('chromedriver');
const { By, Builder } = require("selenium-webdriver");

const fetchMovies = async () => {
  const movies = [];
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://www.cathaycineplexes.com.sg/#movies");
  driver.manage().setTimeouts({ implicit: 10000 });
  const filmContainer = await driver.findElements(
    By.css(
      // '//*[@id="tab1"]/div[contains(@class,"z-50 w-full")]/span/div[contains(@class,"movie-container")]'
      "#tab1 > div.z-50.w-full > span > div.movie-container"
      // "#tab1 > div.z-50.w-full > span > div.movie-container > a > div.flex-col > div.items-center.transition > div.text-left"
    )
  );
  // container.forEach(async (element) => {
  await Promise.all(
    filmContainer.map(async (element) => {
      const movieURLA = await element.findElement(By.css("a"));

      const movieURL = await movieURLA.getAttribute("href");

      const titleDiv = await element.findElement(
        By.css("a > div.flex-col > div.items-center.transition > div.text-left")
      );

      const genreDiv = await element.findElement(
        By.css(
          "a > div.flex-col > div.flex.items-center.transition > div.flex.flex-col.w-full > div.text-left.w-full.text-\\[15px\\].lg\\:text-\\[12px\\].pt-\\[10px\\]"
        )
      );

      const movieDetailsDiv = await element.findElements(
        By.css(
          "a > div.flex-col > div.flex.items-center.transition > div.flex.flex-col.w-full > div.text-left.w-full.text-\\[15px\\].lg\\:text-\\[12px\\]"
        )
      );

      const parentalRatingDiv = movieDetailsDiv[1];
      const durationDiv = movieDetailsDiv[3];

      const movieFormatDiv = await element.findElement(
        By.css(
          "a > div.flex-col > div.flex.items-center.transition > div.flex.flex-col.w-full > div.movie-format"
        )
      );

      const languageDiv = await element.findElement(
        By.css(
          "a > div.flex-col > div.flex.items-center.transition > div.flex.flex-col.w-full > div.movie-audio"
        )
      );

      const genre = (await genreDiv.getAttribute("textContent")).split(",");
      const language = await languageDiv.getAttribute("textContent");
      const title = await titleDiv.getAttribute("textContent");
      const format = await movieFormatDiv.getAttribute("textContent");
      const parentalRating = await parentalRatingDiv.getAttribute(
        "textContent"
      );
      const duration = await durationDiv.getAttribute("textContent");
      movies.push({
        title,
        format,
        language,
        genre,
        duration,
        parentalRating,
        url: movieURL,
      });
    })
  );
  await driver.quit();
  return movies;
};

const fetchShowtimes = async () => {
  const showtimes = {};
  const cinemas = await fetchCinemas();
  const movies = await fetchMovies();

  const cinemaPromise = cinemas.map(async (cinema) => {
    const driver = await new Builder().forBrowser("chrome").build();
    driver.manage().setTimeouts({ implicit: 10000 });
    await driver.get(cinema.url);
    const showtimeElement = await driver.findElements(
      By.css("#show-times-data > div.show-time-data")
    );

    await Promise.all(
      showtimeElement.map(async (element) => {
        const title = await element.getAttribute("title");
        const fullTitle = await element.getAttribute("full_title");
        const filmId = await element.getAttribute("film_id");

        const cinemaName = await element.getAttribute("cinema_name");
        const dateFull = await element.getAttribute("date_full");
        const hour = await element.getAttribute("hour");
        const dateOnly = await element.getAttribute("date_only");
        const showTime = await element.getAttribute("show_time");
        const link = await element.getAttribute("link");
        const pms = await element.getAttribute("pms"); // platnium movie suite

        // const session_id = await element.getAttribute("session_id");
        // const sold_out = await element.getAttribute("sold_out");
        // const cinema_id = await element.getAttribute("cinema_id");
        // const subtitle = await element.getAttribute("subtitle");
        // "Eng Sub", "Chn Sub", "Chn Sub, Eng Sub"

        showtimes[link] = {
          cinemaName,
          dateFull,
          hour,
          dateOnly,
          showTime,
          title,
          fullTitle,
          link,
          pms,
          filmId,
        };
      })
    );

    await driver.quit();
  });
  await Promise.all(cinemaPromise);

  const moviesPromise = movies.map(async (movie) => {
    const driver = await new Builder().forBrowser("chrome").build();
    driver.manage().setTimeouts({ implicit: 10000 });
    await driver.get(movie.url);
    const showtimeElement = await driver.findElements(
      By.css("#show-times-data > div.show-time-data")
    );

    await Promise.all(
      showtimeElement.map(async (element) => {
        const link = await element.getAttribute("link");

        const session_id = await element.getAttribute("session_id");
        const sold_out = await element.getAttribute("sold_out");
        const cinema_id = await element.getAttribute("cinema_id");
        const subtitle = await element.getAttribute("subtitle");
        // "Eng Sub", "Chn Sub", "Chn Sub, Eng Sub"
        if (showtimes[link]) {
          showtimes[link].session_id = session_id;
          showtimes[link].sold_out = sold_out;
          showtimes[link].cinema_id = cinema_id;
          showtimes[link].subtitle = subtitle;
        } else {
          const cinemaName = await element.getAttribute("cinema_name");
          const dateFull = await element.getAttribute("date_full");
          const hour = await element.getAttribute("hour");
          const dateOnly = await element.getAttribute("date_only");
          const showTime = await element.getAttribute("show_time");
          const pms = await element.getAttribute("pms"); // platnium movie suite
          const session_id = session_id;
          const sold_out = sold_out;
          const cinema_id = cinema_id;
          const subtitle = subtitle;
          const debugObject = {
            cinemaName,
            dateFull,
            hour,
            dateOnly,
            showTime,
            pms,
            session_id,
            sold_out,
            cinema_id,
            subtitle,
          };
          const debugString = JSON.stringify(debugObject);
          console.log(`${link}: ${debugString}`);
        }
      })
    );

    await driver.quit();
  });
  await Promise.all(moviesPromise);

  return Object.values(showtimes);
};

const fetchCinemas = async () => {
  const cinemas = [];
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://www.cathaycineplexes.com.sg/cinemas");
  driver.manage().setTimeouts({ implicit: 10000 });
  const cinemasDiv = await driver.findElements(
    By.css(
      "body > div.flex.flex-col.relative > div > div > div > div.h-full.gap-\\[10px\\]"
    )
  );
  await Promise.all(
    cinemasDiv.map(async (element) => {
      const cinemaURLA = await element.findElement(By.css("a.rounded-b-md"));
      const cinemaURL = await cinemaURLA.getAttribute("href");
      const cinemaNameDiv = await element.findElement(
        By.css("div.gap-\\[20px\\] > div.gap-\\[8px\\] > div.font-bold")
      );
      const cinemaName = await cinemaNameDiv.getAttribute("textContent");

      const addressDiv = await element.findElement(
        By.css(
          "div > div > div.flex.flex-col.px-\\[20px\\].text-\\[14px\\].leading-\\[14px\\].gap-\\[10px\\].pb-\\[15px\\] > div.flex.flex-row.gap-\\[10px\\].pt-\\[10px\\] > div"
        )
      );

      const nearestMRTStationDiv = await element.findElement(
        By.css(
          "body > div.flex.flex-col.relative > div > div > div > div.h-full.gap-\\[10px\\] > div > div > div.flex.flex-col.px-\\[20px\\].text-\\[14px\\].leading-\\[14px\\].gap-\\[10px\\].pb-\\[15px\\] > div > div > div.pt-\\[8px\\]"
        )
      );

      const nearestMRTStation = await nearestMRTStationDiv.getAttribute(
        "textContent"
      );

      const gMapsLinkA = await element.findElement(
        By.css("div.flex.flex-col.gap-\\[20px\\] > a")
      );

      const gMapsLink = await gMapsLinkA.getAttribute("href");

      const address = await addressDiv.getAttribute("textContent");

      const cinemaId = cinemaURL.substring(cinemaURL.lastIndexOf("/") + 1);
      cinemas.push({
        id: cinemaId,
        url: cinemaURL,
        cinemaName,
        address,
        nearestMRTStation,
        gMapsLink,
      });
    })
  );
  await driver.quit();
  return cinemas;
};

module.exports = { fetchMovies, fetchShowtimes, fetchCinemas };