const fs = require('fs')
require('events').EventEmitter.defaultMaxListeners = 20

const { lookupMovies } = require('./scripts/metadata/movies')
const { contextualiseCinema } = require('./scripts/metadata/cinemas')
fs.mkdirSync('data/metadata/', { recursive: true })

var steps = ['cinemas', 'movies']
if (process.argv[2]) {
  steps = [process.argv[2]]
}

// jq: '.movies[] | select(.metadata == null)'
// const intermediateData = fs.readFileSync(`data/merge/merge.json`, 'utf8')
// const intermediateObject = JSON.parse(intermediateData)

const runningPromises = []
for (const step of steps) {
  switch (step) {
    case 'movies':
      const moviesPromises = lookupMovies().then(async data => {
        const movies = data
        const movieOutput = JSON.stringify({ movies }, null, 2)
        return await fs.promises.writeFile(
          `data/metadata/movies.json`,
          movieOutput,
          'utf8',
        )
      })
      runningPromises.push(moviesPromises)
      break
    case 'cinemas':
      const cinemaPromise = contextualiseCinema(
        intermediateObject.cinemas,
      ).then(async data => {
        const cinemas = data
        const cinemaOutput = JSON.stringify({ cinemas }, null, 2)
        console.log(cinemaOutput)
        // return await fs.promises.writeFile(
        //   `data/metadata/cinemas.json`,
        //   cinemaOutput,
        //   'utf8',
        // )
      })
      runningPromises.push(cinemaPromise)
      break
    default:
      console.error(`${step} is not valid`)
      return
  }
}

// Promise.all([moviesPromise, cinemaPromise]).then((data) => {
//   const movies = data[0];
//   const cinemas = data[1];
//   const movieOutput = JSON.stringify({ movies }, null, 2);
//   fs.writeFileSync(`data/metadata/movies.json`, movieOutput, "utf8");
//   const cinemaOutput = JSON.stringify({ cinemas }, null, 2);
//   fs.writeFileSync(`data/metadata/cinemas.json`, cinemaOutput, "utf8");
// });

Promise.all(runningPromises).then(() => {
  console.log('complete')
})
