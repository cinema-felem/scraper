const fs = require('fs')
require('events').EventEmitter.defaultMaxListeners = 20

var cinemaChainList = ['cathay', 'gv', 'projector', 'shaw']
var flagSet = false
if (process.argv[2]) {
  cinemaChainList = [process.argv[2]]
  flagSet = true
}

const permutations = true

let merged = {
  movies: [],
  cinemas: [],
  showtimes: [],
}

fs.mkdirSync('data/intermediate/', { recursive: true })
fs.mkdirSync('data/permutation/', { recursive: true })

const generatePermutations = everything => {
  const subObject = ['movies', 'showtimes', 'cinemas']
  const finalObject = {}

  const generatePermutationsResult = showtimeArray => {
    const attributesSetObject = {}

    for (const showtime of showtimeArray) {
      Object.keys(showtime).forEach(key => {
        if (typeof attributesSetObject[key] === 'undefined') {
          attributesSetObject[key] = new Set()
        }
        attributesSetObject[key].add(showtime[key])
      })
    }

    const attributesArrayObject = {}
    Object.keys(attributesSetObject).forEach(key => {
      attributesArrayObject[key] = Array.from(attributesSetObject[key])
    })

    return attributesArrayObject
  }
  for (const sub of subObject) {
    finalObject[sub] = generatePermutationsResult(everything[sub])
  }
  return finalObject
}

for (const cinemaChain of cinemaChainList) {
  const { standardiseCinemaChain } = require(
    '../dist/scripts/transform/' + cinemaChain,
  )
  const cinemaChainText = fs.readFileSync(
    `data/raw/${cinemaChain}.json`,
    'utf8',
  )
  const cinemaChainObject = JSON.parse(cinemaChainText)

  if (permutations) {
    const permutationObject = generatePermutations(cinemaChainObject)
    const everything = JSON.stringify(permutationObject)
    fs.writeFileSync(`data/permutation/${cinemaChain}.json`, everything, 'utf8')
  }

  const standardisedCinemaChainObject =
    standardiseCinemaChain(cinemaChainObject)
  const output = JSON.stringify(standardisedCinemaChainObject, null, 2)
  fs.writeFileSync(`data/intermediate/${cinemaChain}.json`, output, 'utf8')
  merged.movies = merged.movies.concat(standardisedCinemaChainObject.movies)
  merged.cinemas = merged.cinemas.concat(standardisedCinemaChainObject.cinemas)
  merged.showtimes = merged.showtimes.concat(
    standardisedCinemaChainObject.showtimes,
  )
}

const cleanedMovieList = merged => {
  let { movies, cinemas, showtimes } = merged
  const usedMovieIds = new Set()
  for (const showtime of showtimes) {
    usedMovieIds.add(showtime.filmId)
  }
  // console.log(JSON.stringify(Array.from(usedMovieIds)))
  movies = movies.flatMap(movie => {
    if (usedMovieIds.has(movie.id)) {
      return movie
    }
    return []
  })

  return { movies, cinemas, showtimes }
}
if (!flagSet) {
  merged = cleanedMovieList(merged)
  const transformedJSON = JSON.stringify(merged, null, 2)
  fs.writeFileSync(`data/intermediate/merge.json`, transformedJSON, 'utf8')
}
