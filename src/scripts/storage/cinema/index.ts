// import { PrismaClient } from '@prisma/client'

import { StandardCinema } from '@/types/standard'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const insertCinemas = async (cinemas: StandardCinema[]) => {
  const storageMap: any[] = cinemas.map(cinema => {
    const { id, name, searchableName, source } = cinema //type: cinemaType ???
    return {
      id,
      name,
      searchableName,
      source: source?.details,
    }
  })
  return prisma.cinema.createMany({
    data: storageMap,
    skipDuplicates: true,
  })
}

export const queryCinema = async (id: string) => {
  const result = await prisma.cinema.findFirst({
    where: {
      id: {
        equals: id,
      },
    },
  })
  return result
}

export const lookupCinemas = async () => {
  return await prisma.cinema.findMany({})
}

export { updateMetadata } from './metadata'
