// const { getEditDistance, removeMovieDetails } = require('@/text')
import { MergedMovie, StandardMovie } from '@/types/standard'
import { getEditDistance } from './compare'
import { removeMovieDetails } from './title'
import { asciify } from './scrub'
import { Movie } from '@prisma/client'

// export function getClosestMatch(
//   variations: string[],
//   garbageStrings: string[],
// ) {
//   const cleanMovieString = getCleanMovieStringMethod(garbageStrings)
//   const baseMatch = removeMovieDetails(
//     variations[0],
//     cleanMovieString,
//   ).toLowerCase()
//   if (variations.length < 2) return baseMatch

//   let overlappedString = ''
//   for (let i = 0; i < baseMatch.length; i++) {
//     for (let j = i + 1; j <= baseMatch.length; j++) {
//       const substring = baseMatch.substring(i, j)
//       const validCandidate = variations.every(str =>
//         removeMovieDetails(str, cleanMovieString)
//           .toLowerCase()
//           .includes(substring),
//       )
//       if (validCandidate && substring.length > overlappedString.length) {
//         overlappedString = substring
//       }
//     }
//   }
//   return overlappedString
// }

// const getCleanMovieStringMethod = garbageStrings => {
//   return (cleanMovieString = raw => {
//     raw = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '')
//     for (const garbageString of garbageStrings) {
//       cleanedGarbageString = garbageString.title
//         .normalize('NFD')
//         .replace(/\p{Diacritic}/gu, '')
//       raw = raw.toLowerCase().replaceAll(cleanedGarbageString.toLowerCase(), '')
//     }
//     raw = raw.replace(/[^a-zA-Z0-9 ]/g, '')
//     return raw
//   })
// }

export const mergeMovies = (
  moviesList: StandardMovie[],
  garbageStrings: string[] = [],
): MergedMovie[] => {
  const normalizedGarbage = garbageStrings.map(garbage => {
    return asciify(garbage)
  })
  // const cleanMovieString = getCleanMovieStringMethod(garbageStrings)
  const uniqueFilm: MergedMovie[] = []
  movieLoop: for (const movie of moviesList) {
    const { id: loopId, filmTitle, language, format } = movie
    const cleanTitle = removeMovieDetails({
      title: filmTitle,
      textToRemove: normalizedGarbage,
    }).toLowerCase()
    for (const index in uniqueFilm) {
      const movieCandidate = uniqueFilm[index]
      // for (const variation of movieCandidate.titleVariations) {
      const variation = movieCandidate.titleVariations[0]
      const cleanCandidateTitle = removeMovieDetails({
        title: variation,
        textToRemove: normalizedGarbage,
      }).toLowerCase()
      const distance = getEditDistance(cleanTitle, cleanCandidateTitle)
      const shortestText = Math.min(cleanTitle.length, variation.length)
      if (Number(distance) / shortestText < 0.2) {
        uniqueFilm[index]['movieIds'].push(loopId)
        uniqueFilm[index]['titleVariations'].push(filmTitle)
        continue movieLoop
      }
      // }
    }
    uniqueFilm.push({
      language,
      format,
      movieIds: [loopId],
      titleVariations: [filmTitle],
    })
  }

  return uniqueFilm
}
