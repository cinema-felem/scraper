const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const populateUpdates = async () => {
  await prisma.updates.deleteMany({})
  await prisma.updates.createMany({
    data: [
      {
        modelName: 'movies',
        operation: 'delete',
        sourceText: 'MINDS Film Festival 2024',
        sourceField: 'variations',
      },
      {
        modelName: 'movies',
        operation: 'delete',
        sourceText: '$5 Movie Reels (29 Aug - 02 Oct 2024)',
        sourceField: 'variations',
      },
      {
        modelName: 'movies',
        operation: 'merge',
        sourceText: 'Transformers : Rise Of The Beasts',
        destinationText: 'Transformers One',
        sourceField: 'variations',
        destinationField: 'variations',
      },
      // {
      //   modelName: 'movies',
      //   operation: 'merge',
      //   sourceText: 'The Greatest of All Time (GOAT)',
      //   destinationText: 'The Greatest Of All Time',
      //   sourceField: 'title',
      //   destinationField: 'title',
      // },
    ],
  })
}

const populateGarbageStrings = async () => {
  await prisma.GarbageTitle.deleteMany({})
  const garbageStrings = [
    '(Mand)',
    '(T)',
    '(K)',
    '(JPN)',
    '(Malay)',
    'Korean',
    'Chinese',
    'Japanese',
    'Thai',
    '(M)',
    '(J)',
    '(English Sub)',
    '(Chinese Sub)',
    '(KOR)',
    '(CHN)',
    'Family Fun Day',
    '(Chinese Sub)',
    "Fans' Screening:",
    'Gold Class Dining Set:',
    'LPFF',
    'Tamil',
    'Telugu',
    'Hindi',
    'Malayalam',
    'Kannada',
    'Bengali',
    'Tamil',
    'Malayalam',
    'Hindi',
    'Kannada',
    'Tiny Tots Weekend Flix',
    'MHFF',
  ]
  const storageMap = garbageStrings.map(garbageString => {
    // const { id, filmTitle, language, format, sourceIds } = movie
    return {
      title: garbageString,
      // language,
      // format,
      // sourceIds,
    }
  })

  return prisma.GarbageTitle.createMany({
    data: storageMap,
    skipDuplicates: true,
  })
}

module.exports = {
  populateUpdates,
  populateGarbageStrings,
}
