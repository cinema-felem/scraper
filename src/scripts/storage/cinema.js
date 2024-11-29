// import { PrismaClient } from '@prisma/client'

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

// interface Cinema {
//   id: string
//   name: string
//   source: any
// }

// : Cinema[]
const insertCinemas = async cinemas => {
  const storageMap = cinemas.map(cinema => {
    const { id, name, source, type: cinemaType } = cinema
    return {
      chainId: id,
      name,
      cinemaType: cinemaType?.label ? cinemaType?.label : 'Standard',
      source: source?.chainSpecific,
    }
  })
  await prisma.cinema.createMany({
    data: storageMap,
    skipDuplicates: true,
  })
}

const queryCinema = async chainId => {
  const result = await prisma.cinema.findFirst({
    where: {
      chainId: {
        equals: chainId,
      },
    },
  })
  return result
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

// const intermediateData = fs.readFileSync(`data/metadata/cinemas.json`, 'utf8')
//   const data = JSON.parse(intermediateData)
//   for (const cinema of data.cinemas) {
//     const id = cinema.id
//     const queriedCinema = await queryCinema(id)
//     if (!queriedCinema) continue
//     if (queriedCinema?.location) continue
//     await updateMetadata(id, cinema.metadata)
//   }

module.exports = {
  insertCinemas,
  queryCinema,
  updateMetadata,
}
