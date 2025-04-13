import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type CinemaMetadata = {
  address: string
  full_address: string
  searchableName: string
  external_ids: string
}

export const updateMetadata = async (id: string, metadata: CinemaMetadata) => {
  const { address, full_address, searchableName, external_ids } = metadata
  const result = await prisma.cinema.update({
    where: {
      id,
    },
    data: {
      address: address,
      fullAddress: full_address ? full_address : address,
      searchableName: searchableName,
      externalIds: external_ids,
    },
  })
  return result
}
