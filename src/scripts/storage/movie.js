// import { PrismaClient } from '@prisma/client'
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// interface Cinema {
//   id: string
//   name: string
//   source: any
// }

// : Cinema[]
const insertMovies = async movies => {
  const mergedMovies = await mergeMovies(movies)
  const garbageStrings = await prisma.GarbageTitle.findMany({})
  const storageMap = mergedMovies.map(movie => {
    const { variations, language, format, ids } = movie

    const title = getClosestMatch(variations, garbageStrings)
    return {
      title,
      variations,
      language: language ? language : 'Unknown',
      format: format ? format : '2D',
      ids,
    }
  })
  // console.log(storageMap)
  await prisma.movie.createMany({
    data: storageMap,
    skipDuplicates: true,
  })

  // console.dir(result, { depth: null })
}

const retrieveMovies = async () => {
  const result = await prisma.movie.findMany({})
  return result
}

const retrieveTMDB = async tmdbId => {
  const result = await prisma.tmdb.findFirst({
    where: {
      id: Number(tmdbId),
    },
  })
  return result
}

const updateTMDB = async (movie, tmdbMovie) => {
  if (!tmdbMovie?.external_ids?.tmdb_id) return
  const { id, title } = movie

  const result = await prisma.movie.update({
    where: {
      id,
      title,
    },
    data: {
      tmdbId: Number(tmdbMovie.external_ids.tmdb_id),
    },
  })
  await upsertToTMDbTable(tmdbMovie)
  return
}

const upsertToTMDbTable = async tmdbMovie => {
  const { filmTitle, ...tmdbMovieClean } = tmdbMovie

  const id = Number(tmdbMovie?.external_ids?.tmdb_id)

  await prisma.tmdb.upsert({
    where: {
      id,
    },
    update: {
      ...tmdbMovieClean,
    },
    create: {
      id,
      ...tmdbMovieClean,
    },
  })

  // await prisma.tmdb.createMany({
  //   data: [
  //     {
  //       id: Number(tmdbMovie?.external_ids?.tmdb_id),
  //       ...tmdbMovieClean,
  //     },
  //   ],
  //   skipDuplicates: true,
  // })
}

function getClosestMatch(variations, garbageStrings) {
  const cleanMovieString = getCleanMovieStringMethod(garbageStrings)
  const baseMatch = removeMovieDetails(
    variations[0],
    cleanMovieString,
  ).toLowerCase()
  if (variations.length < 2) return baseMatch

  let overlappedString = ''
  for (let i = 0; i < baseMatch.length; i++) {
    for (let j = i + 1; j <= baseMatch.length; j++) {
      const substring = baseMatch.substring(i, j)
      const validCandidate = variations.every(str =>
        removeMovieDetails(str, cleanMovieString)
          .toLowerCase()
          .includes(substring),
      )
      if (validCandidate && substring.length > overlappedString.length) {
        overlappedString = substring
      }
    }
  }
  return overlappedString
}

const queryMovies = async searchQuery => {
  const result = await prisma.movie.findFirst({
    where: searchQuery,
  })
  return result
}

const getFieldQuery = (sourceField, sourceText) => {
  const searchQuery = {}
  switch (sourceField) {
    case 'variations':
    case 'ids':
      searchQuery[sourceField] = {
        has: sourceText,
      }
      break
    case 'language':
    case 'format':
      searchQuery[sourceField] = {
        equals: sourceText,
      }
      break
    default:
      return null
  }
  return searchQuery
}

const readUpdates = async () => {
  const result = await prisma.updates.findMany({})
  for (const update of result) {
    const { modelName, operation, sourceText, sourceField, destinationText } =
      update
    if (modelName !== 'movies') continue
    const searchQuery = getFieldQuery(sourceField, sourceText)
    if (!searchQuery) continue

    const movieSource = await queryMovies(searchQuery)
    if (!movieSource) continue

    switch (operation) {
      case 'merge':
        const destQuery = getFieldQuery(sourceField, destinationText)
        if (!destQuery) continue
        const movieDest = await queryMovies(destQuery)
        if (!movieDest) continue
        const sourceIds = movieSource.ids
        const destIds = movieDest.ids
        const combinedIds = [...new Set([...sourceIds, ...destIds])]

        const sourceVariations = movieSource.variations
        const destVariations = movieDest.variations
        const combinedVariations = [
          ...new Set([...sourceVariations, ...destVariations]),
        ]
        await prisma.movie.update({
          where: {
            id: movieDest.id,
          },
          data: {
            ids: combinedIds,
            variations: combinedVariations,
          },
        })
        await prisma.movie.delete({ where: { id: movieSource.id } })
        console.log(`merge ${movieSource.id}`)
        break
      case 'update':
        await prisma.movie.update({
          where: {
            id: movieDest.id,
          },
          data: {
            sourceIds: combinedIds,
          },
        })
        console.log(`update ${movieSource.id}`)
        break
      case 'delete':
        await prisma.movie.delete({
          where: {
            id: movieSource.id,
          },
        })
        console.log(`delete ${movieSource.id}`)
        break
    }
  }
}

const { getEditDistance, removeMovieDetails } = require('../text')

const mergeMovies = async input => {
  const result = await prisma.GarbageTitle.findMany({})
  let dedupedMovies = mergeDuplicateMovies(input, result)
  const output = JSON.stringify(dedupedMovies, null, 2)
  fs.writeFileSync(`data/merge/initial-matching.json`, output, 'utf8')

  return dedupedMovies
}
const getCleanMovieStringMethod = garbageStrings => {
  return (cleanMovieString = raw => {
    raw = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    for (const garbageString of garbageStrings) {
      cleanedGarbageString = garbageString.title
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
      raw = raw.toLowerCase().replaceAll(cleanedGarbageString.toLowerCase(), '')
    }
    raw = raw.replace(/[^a-zA-Z0-9 ]/g, '')
    return raw
  })
}

const mergeDuplicateMovies = (moviesList, garbageStrings) => {
  const cleanMovieString = getCleanMovieStringMethod(garbageStrings)
  const uniqueFilm = []
  movieLoop: for (const movie of moviesList) {
    const { id: loopId, filmTitle, language, format } = movie
    const cleanTitle = removeMovieDetails(
      filmTitle,
      cleanMovieString,
    ).toLowerCase()
    for (const index in uniqueFilm) {
      const movieCandidate = uniqueFilm[index]
      const candidateTitle = movieCandidate.variations[0]
      const cleanCandidateTitle = removeMovieDetails(
        candidateTitle,
        cleanMovieString,
      ).toLowerCase()
      const { id } = movieCandidate

      const distance = getEditDistance(cleanTitle, cleanCandidateTitle)
      const shortestText = Math.min(cleanTitle.length, candidateTitle.length)
      if (Number(distance) / shortestText < 0.2) {
        uniqueFilm[index]['ids'].push(loopId)
        uniqueFilm[index]['variations'].push(filmTitle)
        continue movieLoop
      }
    }
    uniqueFilm.push({
      // id: generateStringIds(filmTitle),
      // filmTitle,
      language,
      format,
      ids: [loopId],
      variations: [filmTitle],
    })
  }

  return uniqueFilm
}

const updateMetadata = async (chainId, metadata) => {
  const { address, full_address, location, external_ids } = metadata
  const result = await prisma.cinema.update({
    where: {
      chainId,
    },
    data: {
      address: address,
      fullAddress: full_address ? full_address : address,
      location: location,
      externalIds: external_ids,
    },
  })
  return result
}

// main()
//   .then(async () => {
//     await prisma.$disconnect()
//   })
//   .catch(async e => {
//     console.error(e)
//     await prisma.$disconnect()
//     process.exit(1)
//   })

module.exports = {
  insertMovies,
  readUpdates,
  mergeMovies,
  retrieveMovies,
  updateTMDB,
  retrieveTMDB,
  // transformMovies,
  // transformShowtimes,
  // transformCinemas,
}
