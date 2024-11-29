const { By, Builder } = require("selenium-webdriver");

const fetchCinemas = async () => {
  const filmPageResponse = await fetch(
    "https://theprojector.sg/page-data/films/page-data.json"
  );

  const requestObject = await filmPageResponse.json();
  if (
    requestObject &&
    requestObject?.path === "/films/" &&
    requestObject?.result &&
    requestObject?.result?.data?.locations?.edges?.length > 0
  ) {
    const gqlLocations = requestObject?.result?.data?.locations?.edges;
    const locationList = gqlLocations.map((gqlLocation) => {
      const locationObject = {};
      const { fields, frontmatter } = gqlLocation?.node;
      const { venues: gqlVenues } = fields;
      locationObject.venues = gqlVenues
        ? gqlVenues.map((gqlVenue) => {
            const { frontmatter } = gqlVenue;
            return {
              title: frontmatter?.title,
              screens: frontmatter?.screens,
              accessibility: frontmatter?.accessibility,
            };
          })
        : [];

      locationObject.veeziToken = frontmatter.veeziToken;
      locationObject.title = frontmatter.title;
      return locationObject;
    });
    return locationList;
  } else {
    return [];
  }
};

const fetchMovies = async () => {
  const filmPageResponse = await fetch(
    "https://theprojector.sg/page-data/films/page-data.json"
  );

  const requestObject = await filmPageResponse.json();
  if (
    requestObject &&
    requestObject?.path === "/films/" &&
    requestObject?.result &&
    requestObject?.result?.data?.films?.edges?.length > 0
  ) {
    const gqlFilms = requestObject?.result?.data?.films?.edges;
    let movieList = gqlFilms.map((gqlFilm) => {
      const movieObject = {};
      const { fields, frontmatter } = gqlFilm?.node;
      const { themes: gqlThemes, categories: gqlCategories, slug } = fields;
      movieObject.url = `https://theprojector.sg${slug}`;
      movieObject.categories = gqlCategories
        ? gqlCategories.map((gqlCategory) => {
            return gqlCategory?.frontmatter?.title;
          })
        : [];
      movieObject.themes = gqlThemes
        ? gqlThemes.map((gqlTheme) => {
            const { fields, frontmatter } = gqlTheme;
            return {
              slug: fields?.slug,
              id: frontmatter.id,
              title: frontmatter.title.trim(),
            };
          })
        : [];

      movieObject.veeziFilmId = frontmatter.veeziFilmId;
      movieObject.title = frontmatter.title;
      movieObject.description = frontmatter.blurbHtml;
      movieObject.rating = frontmatter.rating;
      movieObject.subtitles = frontmatter.subtitles
        ? frontmatter.subtitles
        : [];
      movieObject.releasingSchedules = frontmatter.releasingSchedules;
      movieObject.eventTypes = frontmatter.eventTypes;
      movieObject.order = frontmatter.order;
      movieObject.coverImage =
        frontmatter.coverImage.childImageSharp?.fluid?.src;
      return movieObject;
    });

    movieList.filter((movie) => {
      return movie?.veeziFilmId;
    });

    const movieListPromise = movieList.map(async (movie) => {
      if (!movie || !movie?.veeziFilmId) return movie;
      const movieDetailResponse = await fetch(
        `https://api.us.veezi.com/v1/film/${movie.veeziFilmId}`,
        {
          headers: {
            accept: "*/*",
            "accept-language":
              "en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5",
            "cache-control": "no-cache",
            pragma: "no-cache",
            priority: "u=1, i",
            "sec-ch-ua":
              '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            veeziaccesstoken: "sVJR4rtFak-ZQvm87lwoIA2",
          },
          referrerPolicy: "same-origin",
          body: null,
          method: "GET",
        }
      );

      const movieDetail = await movieDetailResponse.json();
      movie.movieDetail = movieDetail;
      return movie;
    });
    return await Promise.all(movieListPromise);
  } else {
    return [];
  }
};

const fetchShowtimes = async () => {
  const veeziResponse = await fetch("https://api.us.veezi.com/v1/websession/", {
    headers: {
      accept: "*/*",
      "accept-language":
        "en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      veeziaccesstoken: "sVJR4rtFak-ZQvm87lwoIA2",
    },
    referrerPolicy: "same-origin",
    body: null,
    method: "GET",
  });

  return await veeziResponse.json();
};

module.exports = { fetchCinemas, fetchMovies, fetchShowtimes };
