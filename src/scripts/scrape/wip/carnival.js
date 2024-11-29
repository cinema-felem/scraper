// interface CARNIVAL_MOVIES_DETAILS {
//   code: string;
//   name: string;
//   censor: string;
//   language: string;
//   duration: number;
//   genre: string;
//   description: string;
//   openingDate: string;
//   imageURL: string;
//   actor: string;
//   director: string;
//   YouTubeURL: string;
// }

const fetchMovies = async () => {
  const moviesList = await fetch(
    "https://service.carnivalcinemas.sg/api/QuickSearch/GetAllMovieDetail?locationName=Mumbai",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        token:
          "QnQ2V3lBdWNYMXdWYkt6a1RISzdxeEFnT1NVaU9LVDUrbzlYZ1QzcmxwWT18aHR0cHM6Ly9jYXJuaXZhbGNpbmVtYXMuc2cvIy9Nb3ZpZXN8NjM4MjcwMDc4NzAzNDYwMDAwfHJ6OEx1T3RGQlhwaGo5V1FmdkZo",
      },
      referrer: "https://carnivalcinemas.sg/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "omit",
    }
  );
  console.log(await moviesList.json());
};

const fetchShowtimes = async () => {
  const moviesList = await fetch(
    "https://service.carnivalcinemas.sg/api/QuickSearch/GetCinemaAndShowTimeByMovie?location=Mumbai&date=2024-04-27T00:00:00&movieCode=Rathnam%20(NC16)",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        token:
          "QnQ2V3lBdWNYMXdWYkt6a1RISzdxeEFnT1NVaU9LVDUrbzlYZ1QzcmxwWT18aHR0cHM6Ly9jYXJuaXZhbGNpbmVtYXMuc2cvIy9Nb3ZpZXN8NjM4MjcwMDc4NzAzNDYwMDAwfHJ6OEx1T3RGQlhwaGo5V1FmdkZo",
      },
      referrer: "https://carnivalcinemas.sg/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "omit",
    }
  );
};

const fetchCinemas = async () => {};

// export { fetchEagleWingsMovies };
module.exports = { fetchMovies, fetchShowtimes, fetchCinemas };
