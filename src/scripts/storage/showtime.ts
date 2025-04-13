import { StandardShowtime } from '@/types/standard'
import { PrismaClient, Showtime, Movie } from '@prisma/client'
import { retrieveMovies } from './movie'

const prisma = new PrismaClient()

/**
 * Insert showtimes into the database with optimized movie ID lookup
 * @param {StandardShowtime[]} showtimes - Array of standardized showtime objects to insert
 * @returns {Promise<void>}
 * @throws {StorageError} When database operations fail
 */
export const insertShowtimes = async (showtimes: StandardShowtime[]) => {
  console.log(`Processing ${showtimes.length} showtimes for insertion...`)

  // Clear existing showtimes
  await prisma.showtime.deleteMany({})
  console.log('Cleared existing showtimes from database')

  // Fetch all movies from database once
  const movies = await retrieveMovies()
  console.log(`Retrieved ${movies.length} movies from database for ID mapping`)

  // Create a map of movie IDs for efficient lookup
  const movieIdMap = new Map<string, string>()

  // Populate the map with all movie IDs from all movies
  movies.forEach(movie => {
    if (movie.movieIds && Array.isArray(movie.movieIds)) {
      movie.movieIds.forEach(id => {
        movieIdMap.set(id, movie.id)
      })
    }
  })

  console.log(`Created lookup map with ${movieIdMap.size} movie IDs`)

  // Array to hold valid showtime objects for insertion
  const validShowtimesData = []
  let skippedCount = 0

  // Process each showtime
  for (const showtime of showtimes) {
    const {
      id,
      filmId,
      cinemaId,
      unixTime,
      link,
      ticketType,
      movieFormat,
      details,
    } = showtime

    // Basic validation
    if (!filmId) {
      console.log('Showtime missing filmId:', showtime)
      skippedCount++
      continue // Skip to the next showtime
    }

    if (!unixTime) {
      console.log(`Showtime ${id} has no timestamp`)
      skippedCount++
      continue // Skip to the next showtime
    }

    // Get the database film ID from our map
    const dbFilmId = movieIdMap.get(filmId)

    // If movie ID not found in DB, skip this showtime
    if (!dbFilmId) {
      console.log(
        `Movie with theatreFilmId ${filmId} not found in database. Skipping showtime.`,
      )
      skippedCount++
      continue // Skip to the next showtime in the loop
    }

    const bigIntTime = BigInt(unixTime)

    // Construct the showtime data object for Prisma
    const showtimeData = {
      theatreFilmId: filmId, // Original filmId from the source
      filmId: dbFilmId, // The actual Movie ID from our database
      cinemaId,
      unixTime: bigIntTime,
      link,
      ticketType: ticketType?.type ? ticketType?.type : 'Standard',
      movieFormat,
      details,
    }

    validShowtimesData.push(showtimeData) // Add the valid data to our array
  }

  // Insert all valid showtimes in one batch
  if (validShowtimesData.length > 0) {
    await prisma.showtime.createMany({
      data: validShowtimesData,
      skipDuplicates: true,
    })
  }

  console.log(
    `Successfully inserted ${validShowtimesData.length} showtimes (${skippedCount} skipped due to missing or invalid data)`,
  )

  // Log statistics about the insertion process
  const uniqueMovies = new Set(validShowtimesData.map(st => st.filmId)).size
  const uniqueCinemas = new Set(validShowtimesData.map(st => st.cinemaId)).size
  console.log(
    `Showtimes cover ${uniqueMovies} unique movies across ${uniqueCinemas} cinemas`,
  )
}
