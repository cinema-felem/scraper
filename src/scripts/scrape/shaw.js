// interface SHAW_MOVIES_FORMAT {
//     synopsisShort: string,
//     releaseDate: Date,
//     isLimited: boolean,
//     isNewRelease: boolean,
//     isExclusive: boolean,
//     isSneakPreview: boolean,
//     isAdvanceSales: boolean,
//     movieReleaseId: number,
//     duration: number,
//     posterUrl: string,
//     primaryTitle: string,
//     formatCode: string,
//     classifyCode: string,
//     adviceName: string,
//     code: string | null,
// }

const fetchFilmFestival = async code => {
  const movieDetails = await fetch(
    `https://shaw.sg/get_film_festival_movies?code=${code}`,
    {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'service-worker-navigation-preload': 'true',
        'upgrade-insecure-requests': '1',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    },
  )
  return movieDetails.json()
}

const fetchMovies = async () => {
  const nowShowingMoviesList = await fetch(
    'https://shaw.sg/get_now_showing_movies',
    {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'service-worker-navigation-preload': 'true',
        'upgrade-insecure-requests': '1',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    },
  )

  const advanceMoviesList = await fetch(
    'https://shaw.sg/get_advance_sale_movies',
    {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'service-worker-navigation-preload': 'true',
        'upgrade-insecure-requests': '1',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    },
  )

  const comingMoviesList = await fetch(
    'https://shaw.sg/get_coming_soon_movies',
    {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'sec-ch-ua':
          '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'service-worker-navigation-preload': 'true',
        'upgrade-insecure-requests': '1',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    },
  )

  let [nowShowingMovies, filmFestivals] = partition(
    await nowShowingMoviesList.json(),
    movie => movie.code === null,
  )

  for (const filmFestival of filmFestivals) {
    const filmFestivalMovies = await fetchFilmFestival(filmFestival.code)
    nowShowingMovies = nowShowingMovies.concat(filmFestivalMovies)
  }

  const moviesList = [
    ...nowShowingMovies,
    ...(await advanceMoviesList.json()),
    ...(await comingMoviesList.json()),
  ]

  function uniqByKeepFirst(a, key) {
    let seen = new Set()
    return a.filter(item => {
      let k = key(item)
      return seen.has(k) ? false : seen.add(k)
    })
  }

  return uniqByKeepFirst(moviesList, movie => movie.movieReleaseId)
}

//Partition function
function partition(array, filter) {
  let pass = [],
    fail = []
  array.forEach((e, idx, arr) => (filter(e, idx, arr) ? pass : fail).push(e))
  return [pass, fail]
}

const fetchCinemas = async () => {
  const cinemaList = await fetch('https://shaw.sg/get_simple_locations', {
    headers: {
      accept: '*/*',
      'accept-language':
        'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
      'content-type': 'application/json',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      cookie:
        '_fbp=fb.1.1704272398099.1547483012; ai_user=VrEgw4NbCGiNi20zM31fwj|2024-01-03T08:59:59.007Z; zarget_user_id=f881b1c2-12cb-4063-a17f-28a8441047da; f881b1c2-12cb-4063-a17f-28a8441047da=1; f881b1c2-12cb-4063-a17f-28a8441047da=1; _tt_enable_cookie=1; _ttp=TEU5pA3KQ4ggnrPbbmT3mOlbi-9; _ga=GA1.1.590601271.1704272397; _ga_372J8T8YYJ=GS1.1.1712904106.1.1.1712904131.35.0.0; .AspNetCore.Session=CfDJ8BAOICutCa9Bv1xuokPnZp3n9tlkkMXduTUawbfajyuB4TzXvUaYGkrkTaGYBeCiDK%2BYQthupgYaN3zJuntFL7r67jTW7YfJzOuuoufQLM3QQJytZGcfxJy9d24Ppt%2BCwNqPS3SD7jOwDX2TZ2L8gD8CdOMrNFH4J0icnd44dZv4; .AspNetCore.Antiforgery.9fXoN5jHCXs=CfDJ8BAOICutCa9Bv1xuokPnZp3MNPWvvXzHqTwtK1mThUaLI6ZJXpJ_xYoQi5y_v6pf-OzopbGNZBmbHrYI3l-39Z0LKz5oPUlvVlzB6g0jIYTUQySN_4BARQ3XsZFFiGKw57iKjdWLmfnF3550fxUMyG0; x-ms-routing-name=self; TiPMix=65.97875295854602; com.bugpilot.report.id=73267de5-6125-4b47-9c67-e04468f5ff47:r1-Ltu5Sasni6ISumf-9Od7y; ai_session=uGNK5EDWMsrhg5rc+3/O2v|1714371279064|1714371305631; _ga_5PQBYJ3D2R=GS1.1.1714371275.41.1.1714371322.0.0.0',
      Referer: 'https://shaw.sg/Showtimes/2024-04-29/All/no-referrer',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'GET',
  })

  return cinemaList.json()
}

const getDateString = dateValue => {
  // YYYY-MM-DD
  return dateValue.toLocaleDateString('swe', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const getDateShowtimes = async date => {
  const dateString = getDateString(date)
  const showtimesList = await fetch(
    `https://shaw.sg/get_show_times?` +
      new URLSearchParams({
        date: dateString,
        movieId: 0,
        locationId: 0,
        locationBrand: 0,
        promotionId: 0,
      }),
    {
      headers: {
        accept: '*/*',
        'accept-language':
          'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
        'content-type': 'application/json',
        priority: 'u=1, i',
        'request-id': '|d8c90bee042a46a284494294e5f7c998.b523511f9d4943a0',
        'sec-ch-ua':
          '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        traceparent: '00-d8c90bee042a46a284494294e5f7c998-b523511f9d4943a0-01',
        cookie:
          '_fbp=fb.1.1704272398099.1547483012; ai_user=VrEgw4NbCGiNi20zM31fwj|2024-01-03T08:59:59.007Z; zarget_user_id=f881b1c2-12cb-4063-a17f-28a8441047da; f881b1c2-12cb-4063-a17f-28a8441047da=1; f881b1c2-12cb-4063-a17f-28a8441047da=1; _tt_enable_cookie=1; _ttp=TEU5pA3KQ4ggnrPbbmT3mOlbi-9; _ga=GA1.1.590601271.1704272397; _ga_372J8T8YYJ=GS1.1.1712904106.1.1.1712904131.35.0.0; .AspNetCore.Session=CfDJ8BAOICutCa9Bv1xuokPnZp3n9tlkkMXduTUawbfajyuB4TzXvUaYGkrkTaGYBeCiDK%2BYQthupgYaN3zJuntFL7r67jTW7YfJzOuuoufQLM3QQJytZGcfxJy9d24Ppt%2BCwNqPS3SD7jOwDX2TZ2L8gD8CdOMrNFH4J0icnd44dZv4; .AspNetCore.Antiforgery.9fXoN5jHCXs=CfDJ8BAOICutCa9Bv1xuokPnZp3MNPWvvXzHqTwtK1mThUaLI6ZJXpJ_xYoQi5y_v6pf-OzopbGNZBmbHrYI3l-39Z0LKz5oPUlvVlzB6g0jIYTUQySN_4BARQ3XsZFFiGKw57iKjdWLmfnF3550fxUMyG0; x-ms-routing-name=self; TiPMix=65.97875295854602; com.bugpilot.report.id=73267de5-6125-4b47-9c67-e04468f5ff47:r1-Ltu5Sasni6ISumf-9Od7y; ai_session=uGNK5EDWMsrhg5rc+3/O2v|1714371279064|1714371305631; _ga_5PQBYJ3D2R=GS1.1.1714371275.41.1.1714371322.0.0.0',
        Referer: `https://shaw.sg/Showtimes/${dateString}/All/no-referrer`,
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: null,
      method: 'GET',
    },
  )

  return showtimesList
}

const mergeShowtimes = (exist, newRecords) => {
  if (!(newRecords.length > 0)) {
    return exist
  }
  for (const cinemaMovieShowtimes of newRecords) {
    const { showTimes: movieTimeslots, ...movieInfo } = cinemaMovieShowtimes
    for (const timeslot of movieTimeslots) {
      const movieTimeslotContext = {
        ...movieInfo,
        ...timeslot,
      }
      exist.push(movieTimeslotContext)
    }
  }
  return exist
}

const fetchShowtimes = async () => {
  const days = 7
  const queryDate = new Date()
  queryDate.setHours(0, 0, 0, 0)
  let showtimes = []

  for (let i = 0; i < days; i++) {
    const dayShowtimesResponse = await getDateShowtimes(queryDate)
    const dayShowtimeObject = await dayShowtimesResponse.json()
    showtimes = mergeShowtimes(showtimes, dayShowtimeObject)
    queryDate.setDate(queryDate.getDate() + 1)
  }
  return showtimes
}

module.exports = { fetchMovies, fetchShowtimes, fetchCinemas }
