const fs = require('fs')
require('events').EventEmitter.defaultMaxListeners = 20

const { insertCinemas } = require('./scripts/storage/cinema')
const { insertMovies, readUpdates } = require('./scripts/storage/movie')
const { insertShowtimes } = require('./scripts/storage/showtime')
const {
  populateUpdates,
  populateGarbageStrings,
} = require('./scripts/storage/updates')

// const { contextualiseCinema } = require('./scripts/metadata/cinemas')

var steps = ['cinemas', 'movies', 'showtimes', 'updates']
if (process.argv[2]) {
  steps = [process.argv[2]]
}

// jq: '.movies[] | select(.metadata == null)'
const intermediateData = fs.readFileSync(`data/intermediate/merge.json`, 'utf8')
const intermediateObject = JSON.parse(intermediateData)
const promiseArray = []

fs.mkdirSync('data/merge/', { recursive: true })
// populateUpdates()
// populateGarbageStrings()

for (const step of steps) {
  switch (step) {
    case 'movies':
      // console.log(intermediateObject.movies)
      promiseArray.push(insertMovies(intermediateObject.movies))
      break
    case 'cinemas':
      // console.log(intermediateObject.cinemas)
      promiseArray.push(insertCinemas(intermediateObject.cinemas))
      break
    case 'showtimes':
      // console.log(intermediateObject.showtimes)
      promiseArray.push(insertShowtimes(intermediateObject.showtimes))
      break
    case 'updates':
      promiseArray.push(readUpdates())
      break
    case 'populate':
      promiseArray.push(populateUpdates())
      promiseArray.push(populateGarbageStrings())
      break
    case 'metadata':
      promiseArray.push(populateUpdates())
      promiseArray.push(populateGarbageStrings())
      break
    default:
      console.error(`${step} is not valid`)
      return
  }
}

Promise.all(promiseArray).then(data => {
  console.log(data)
  // const movies = data[0]
  // const cinemas = data[1]
  // const movieOutput = JSON.stringify({ movies }, null, 2)
  // fs.writeFileSync(`data/metadata/movies.json`, movieOutput, 'utf8')
  // const cinemaOutput = JSON.stringify({ cinemas }, null, 2)
  // fs.writeFileSync(`data/metadata/cinemas.json`, cinemaOutput, 'utf8')
})
