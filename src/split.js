const fs = require("fs");
require("events").EventEmitter.defaultMaxListeners = 20;

const showtimesData = fs.readFileSync(`data/merge/showtimes.json`, "utf8");
const cinemasData = fs.readFileSync(`data/metadata/cinemas.json`, "utf8");
const moviesData = fs.readFileSync(`data/metadata/movies.json`, "utf8");

const showtimes = JSON.parse(showtimesData);
const { cinemas } = JSON.parse(cinemasData);
const { movies } = JSON.parse(moviesData);

const combinedOutput = JSON.stringify({ movies, cinemas, showtimes }, null, 2);
fs.writeFileSync(`data/dist/combined.json`, combinedOutput, "utf8");

// Movie-only data
const movieLite = () => {
  const movieLiteData = movies.map((movieData, index, array) => {
    const { id, filmTitle, language, format, sourceIds, metadata } = movieData;
    const metadataLite = {
      parental: metadata?.parental,
      runtime: metadata?.runtime,
      ratings: metadata?.ratings,
      genres: metadata?.genres,
      release_date: metadata?.release_date,
      poster_path: metadata?.poster_path,
    };

    return {
      id,
      filmTitle,
      language,
      sourceIds,
      ...metadataLite,
    };
  });
  const combinedOutput = JSON.stringify({ movies: movieLiteData }, null, 2);
  fs.writeFileSync(`data/dist/moviesLite.json`, combinedOutput, "utf8");
};

movieLite();

const movieFull = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const movieFullData = movies.map((movieData, index, array) => {
    const { id, filmTitle, language, format, sourceIds, metadata } = movieData;
    const movieShowtimes = showtimes.filter((showtime) => {
      return showtime.filmId === id;
    });

    const inflatedShowtimes = movieShowtimes.map((showtime, index, array) => {
      const { cinemaId, unixTime } = showtime;
      const date = new Date(unixTime + 28800000); // epoch shifting
      const cinema = cinemas.filter((cinema) => {
        return cinema.id === cinemaId;
      })[0];
      let inflatedShowtime = {
        ...showtime,
        time: {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          date: date.getUTCDate(),
          hour: date.getUTCHours(),
          min: date.getUTCMinutes(),
        },
        cinema,
      };

      return inflatedShowtime;
    });

    const sortedInflatedShowtimes = inflatedShowtimes.sort((a, b) => {
      return a.unixTime - b.unixTime;
    });

    return {
      id,
      filmTitle,
      language,
      sourceIds,
      metadata,
      showtimes: sortedInflatedShowtimes,
    };
  });
  const combinedOutput = JSON.stringify({ movies: movieFullData }, null, 2);
  fs.writeFileSync(`data/dist/moviesFull.json`, combinedOutput, "utf8");
  for (const movie of movieFullData) {
    const combinedOutput = JSON.stringify({ movie }, null, 2);
    fs.writeFileSync(
      `data/dist/movie/${movie.id}.json`,
      combinedOutput,
      "utf8"
    );
  }
};

movieFull();

const cinemasLite = () => {};

const cinemasFull = () => {};

const showtimeLite = () => {};

const showtimeFull = () => {};

// Promise.all([moviesPromise, cinemaPromise]).then((data) => {
//   const movies = data[0];
//   const cinemas = data[1];
//   const movieOutput = JSON.stringify({ movies }, null, 2);
//   fs.writeFileSync(`data/metadata/movies.json`, movieOutput, "utf8");
//   const cinemaOutput = JSON.stringify({ cinemas }, null, 2);
//   fs.writeFileSync(`data/metadata/cinemas.json`, cinemaOutput, "utf8");
// });
