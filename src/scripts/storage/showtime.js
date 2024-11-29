// import { PrismaClient } from '@prisma/client'

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// interface Cinema {
//   id: string
//   name: string
//   source: any
// }

// : Cinema[]
const insertShowtimes = async showtimes => {
  await prisma.showtime.deleteMany({})
  const storageMap = await Promise.all(
    showtimes.flatMap(async showtime => {
      const {
        id,
        filmId,
        cinemaId,
        unixTime,
        link,
        ticketType,
        movieFormat,
        chainSpecific,
      } = showtime

      const { id: dbFilmId } = await prisma.movie.findFirst({
        where: {
          ids: {
            has: filmId,
          },
        },
      })

      if (!unixTime) {
        console.log(`showtime ${id} has no timestamp`)
        return []
      }

      if (!filmId) {
        console.log(showtime)
        return []
      }

      return {
        // id,
        chainFilmId: filmId,
        filmId: dbFilmId,
        cinemaId,
        unixTime,
        link,
        ticketType: ticketType?.type ? ticketType?.type : 'Standard',
        movieFormat,
        chainSpecific,
      }
    }),
  )

  await prisma.showtime.createMany({
    data: storageMap,
    skipDuplicates: true,
  })

  // console.dir(result, { depth: null })
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
  insertShowtimes,
  // transformShowtime,
  // transformShowtimes,
  // transformCinemas,
}
