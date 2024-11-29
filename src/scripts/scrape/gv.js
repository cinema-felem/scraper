const fetchMovies = async () => {
  const showingMoviesList = await fetch(
    'https://www.gv.com.sg/.gv-api/nowshowing',
    {
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        x_developer: 'ENOVAX',
        Referer: 'https://www.gv.com.sg/GVMovies',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: null,
      method: 'POST',
    },
  )

  const comingMoviesList = await fetch(
    'https://www.gv.com.sg/.gv-api/comingsoon',
    {
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        x_developer: 'ENOVAX',
        Referer: 'https://www.gv.com.sg/GVMovies',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: null,
      method: 'POST',
    },
  )

  const advancedMoviesList = await fetch(
    'https://www.gv.com.sg/.gv-api/advancesales',
    {
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        x_developer: 'ENOVAX',
        Referer: 'https://www.gv.com.sg/GVMovies',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: null,
      method: 'POST',
    },
  )

  const moviesResponse = await Promise.all([
    showingMoviesList,
    comingMoviesList,
    advancedMoviesList,
  ])
  let moviesList = []

  for (const response of moviesResponse) {
    const requestObject = await response.json()
    if (
      requestObject &&
      requestObject?.success &&
      requestObject?.data.length > 0
    ) {
      moviesList = moviesList.concat(requestObject.data)
    }
  }

  return uniqByKeepFirst(moviesList, movie => movie.filmCd)
}

function uniqByKeepFirst(a, key) {
  let seen = new Set()
  return a.filter(item => {
    let k = key(item)
    return seen.has(k) ? false : seen.add(k)
  })
}

const fetchCinemas = async () => {
  const cinemaList = await fetch('https://www.gv.com.sg/.gv-api/cinemas', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language':
        'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVBuyTickets',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'POST',
  })

  const requestObject = await cinemaList.json()
  if (requestObject && requestObject?.data.length > 0) return requestObject.data

  return requestObject
}

const getDateShowtimes = async date => {
  return await fetch('https://www.gv.com.sg/.gv-api/v2buytickets', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language':
        'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
      'content-type': 'application/json; charset=UTF-8',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      x_developer: 'ENOVAX',
      Referer: 'https://www.gv.com.sg/GVBuyTickets',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `{"cinemaId":"","filmCode":"","date":${date},"advanceSales":false}`,
    method: 'POST',
  })
}

const mergeShowtimes = (exist, newRecords) => {
  if (!(newRecords?.data?.cinemas?.length > 0)) return exist
  for (const cinemaShowtimes of newRecords.data.cinemas) {
    const { id: cinemaId, movies } = cinemaShowtimes
    for (const cinemaMovieShowtimes of movies) {
      const { times: movieTimeslots, ...movieInfo } = cinemaMovieShowtimes
      for (const timeslot of movieTimeslots) {
        const movieTimeslotContext = {
          cinemaId,
          ...movieInfo,
          ...timeslot,
        }
        exist.push(movieTimeslotContext)
      }
    }
  }
  return exist
}

const fetchShowtimes = async () => {
  const days = 7
  const queryDate = new Date()
  queryDate.setHours(0, 0, 0, 0)
  const showtimes = []
  for (let i = 0; i < days; i++) {
    const dayShowtimesResponse = await getDateShowtimes(queryDate.getTime())
    const dayShowtimeObject = await dayShowtimesResponse.json()
    mergeShowtimes(showtimes, dayShowtimeObject)
    queryDate.setDate(queryDate.getDate() + 1)
  }
  return showtimes
}

module.exports = { fetchMovies, fetchShowtimes, fetchCinemas }
