// interface EAGLEWING_MOVIES_DETAILS {
//   link: string,
//   image: string,
//   title: string,
//   rating: string,
//   openingdate: string,
//   description: string,
// }

// interface CARNIVAL_ERRORCODE {
//   ErrorCode: string,
//   ErrorMessage: string
// }

// interface CARNIVAL_MOVIES_RESPONSE {
//   ErrorCode: string,
//   ErrorMessage: string
// }

const fetchMovies = async () => {
  const moviesList = await fetch(
    "https://www.eaglewingscinematics.com.sg/api/v1/film/showings",
    {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua":
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-csrf-token": "oMYYscZ9990fXVg7vi0FAd6uMYEv6I5S4YYspcWi",
        "x-requested-with": "XMLHttpRequest",
        "x-xsrf-token":
          "eyJpdiI6IjZQMlhYTXdiMk5hYVwvSHcyVmJqNGZBPT0iLCJ2YWx1ZSI6InhEQU9Cc0lQV1FIcHlBQXgyb1ZjWU5KSkFnb1pJb0tVWW8yZlhvdnFaNTUwU3lvcjF6dm5iTGxYcXYrM0FCMVAiLCJtYWMiOiJmODQwZjdlNzM0ZjdiMWNlMmM0MDQyNjBmZWUxMjNiYWE0YTE5ZDhmNjcxNWRlNDFkMGE1MTljOWE5OTBhNzA2In0=",
      },
      referrer: "https://www.eaglewingscinematics.com.sg/movies",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    }
  );
  return await moviesList.json();
};

const fetchShowtimes = () => {};
const fetchCinemas = () => {};

// export { fetchEagleWingsMovies };
module.exports = { fetchMovies, fetchShowtimes, fetchCinemas };
