const fs = require('fs')
require('events').EventEmitter.defaultMaxListeners = 20
require('chromedriver')

var cinemaChainList = ['cathay', 'gv', 'projector', 'shaw']
if (process.argv[2]) {
  cinemaChainList = [process.argv[2]]
}

fs.mkdirSync('data/raw/', { recursive: true })

for (const cinemaChain of cinemaChainList) {
  const { fetchMovies, fetchCinemas, fetchShowtimes, contigency } = require(
    './scripts/scrape/' + cinemaChain,
  )

  const moviesPromise = fetchMovies()
  const cinemasPromise = fetchCinemas()
  const showtimesPromise = fetchShowtimes()

  Promise.all([moviesPromise, cinemasPromise, showtimesPromise]).then(
    async data => {
      let [movies, cinemas, showtimes] = data
      if (contigency) {
        ;[movies, cinemas, showtimes] = await contigency(
          movies,
          cinemas,
          showtimes,
        )
      }
      const output = JSON.stringify({ movies, cinemas, showtimes }, null, 2)

      fs.writeFileSync(`data/raw/${cinemaChain}.json`, output, 'utf8')
    },
  )
}
