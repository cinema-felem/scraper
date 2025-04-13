import { Movie } from '@prisma/client'
import { StandardMovie, MergedMovie } from '@/types/standard'
import { PrismaClient } from '@prisma/client'
import { mergeMovieDuplicates } from '../../../text'

const prisma = new PrismaClient()

/**
 * Insert movies into the database with duplicate detection and update existing records
 * @param {StandardMovie[]} movies - Array of standardized movie objects to insert
 * @returns {Promise<void>}
 * @throws {StorageError} When database operations fail
 */
export const insertMovies = async (movies: StandardMovie[]) => {
  try {
    console.log(`Processing ${movies.length} movies for insertion...`)

    // Get garbage strings for title cleaning
    const garbageString: string[] = await getAllGarbageStrings()

    // Merge duplicate movies based on title similarity
    const mergedMovies = await mergeMovieDuplicates(movies, garbageString)
    console.log(
      `After merging duplicates: ${mergedMovies.length} unique movies`,
    )

    // Fetch existing movies from database for comparison
    const existingMovies = await retrieveMovies()
    console.log(`Found ${existingMovies.length} existing movies in database`)

    // Create maps for efficient lookups
    const existingMovieMap = new Map<string, Movie>()
    const existingTitleMap = new Map<string, string>()
    const existingMovieIdMap = new Map<string, string>()

    existingMovies.forEach(movie => {
      // Map by ID to the full movie object for later updates
      existingMovieMap.set(movie.id, movie)

      // Map by title (lowercase for case-insensitive comparison)
      if (movie.title) {
        existingTitleMap.set(movie.title.toLowerCase(), movie.id)
      }

      // Map by title variations
      if (movie.titleVariations && Array.isArray(movie.titleVariations)) {
        movie.titleVariations.forEach(variation => {
          if (variation) {
            existingTitleMap.set(variation.toLowerCase(), movie.id)
          }
        })
      }

      // Map by all movie IDs in the array
      if (movie.movieIds && Array.isArray(movie.movieIds)) {
        movie.movieIds.forEach(id => {
          existingMovieIdMap.set(id, movie.id)
        })
      }
    })

    // Separate movies into new ones and those that need updates
    const newMovies: MergedMovie[] = []
    const moviesToUpdate: { id: string; titleVariations: string[]; movieIds: string[] }[] = []
    
    for (const movie of mergedMovies) {
      let existingMovieId: string | null = null
      
      // Check if movie ID already exists
      if (existingMovieMap.has(movie.id)) {
        existingMovieId = movie.id
      }
      
      // Check if movie title already exists
      else if (movie.title && existingTitleMap.has(movie.title.toLowerCase())) {
        existingMovieId = existingTitleMap.get(movie.title.toLowerCase())
      }
      
      // Check if any title variation already exists
      else if (movie.titleVariations && Array.isArray(movie.titleVariations)) {
        for (const variation of movie.titleVariations) {
          if (variation && existingTitleMap.has(variation.toLowerCase())) {
            existingMovieId = existingTitleMap.get(variation.toLowerCase())
            break
          }
        }
      }
      
      // Check if any movie ID already exists
      if (!existingMovieId && movie.movieIds && Array.isArray(movie.movieIds)) {
        for (const id of movie.movieIds) {
          if (existingMovieIdMap.has(id)) {
            existingMovieId = existingMovieIdMap.get(id)
            break
          }
        }
      }
      
      // If movie exists, prepare update with new variations and IDs
      if (existingMovieId) {
        const existingMovie = existingMovieMap.get(existingMovieId)
        if (existingMovie) {
          const newTitleVariations: string[] = []
          const newMovieIds: string[] = []
          
          // Add new title variations
          if (movie.titleVariations && Array.isArray(movie.titleVariations)) {
            for (const variation of movie.titleVariations) {
              if (variation && 
                  (!existingMovie.titleVariations || 
                   !existingMovie.titleVariations.includes(variation))) {
                newTitleVariations.push(variation)
              }
            }
          }
          
          // Add new movie IDs
          if (movie.movieIds && Array.isArray(movie.movieIds)) {
            for (const id of movie.movieIds) {
              if (id && 
                  (!existingMovie.movieIds || 
                   !existingMovie.movieIds.includes(id))) {
                newMovieIds.push(id)
              }
            }
          }
          
          // Only update if there are new variations or IDs
          if (newTitleVariations.length > 0 || newMovieIds.length > 0) {
            moviesToUpdate.push({
              id: existingMovieId,
              titleVariations: newTitleVariations,
              movieIds: newMovieIds
            })
          }
        }
      } else {
        // This is a new movie - ensure it has the required properties for MergedMovie
        newMovies.push({
          ...movie,
          titleVariations: movie.titleVariations || [],
          movieIds: movie.movieIds || []
        })
      }
    }

    console.log(
      `Inserting ${newMovies.length} new movies, updating ${moviesToUpdate.length} existing movies (${movies.length - newMovies.length - moviesToUpdate.length} unchanged)`,
    )

    // Insert new movies
    if (newMovies.length > 0) {
      await prisma.movie.createMany({
        data: newMovies as any[],
        skipDuplicates: true,
      })
      console.log(`Successfully inserted ${newMovies.length} new movies`)
    }
    
    // Update existing movies with new title variations and movie IDs
    if (moviesToUpdate.length > 0) {
      let updatedCount = 0
      
      for (const movieUpdate of moviesToUpdate) {
        const existingMovie = existingMovieMap.get(movieUpdate.id)
        if (existingMovie) {
          // Prepare the update data
          const updatedTitleVariations = [
            ...(existingMovie.titleVariations || []),
            ...movieUpdate.titleVariations
          ]
          
          const updatedMovieIds = [
            ...(existingMovie.movieIds || []),
            ...movieUpdate.movieIds
          ]
          
          // Update the movie record
          await prisma.movie.update({
            where: { id: movieUpdate.id },
            data: {
              titleVariations: updatedTitleVariations,
              movieIds: updatedMovieIds,
              updatedAt: new Date()
            }
          })
          updatedCount++
        }
      }
      
      console.log(`Successfully updated ${updatedCount} existing movies with new identifiers`)
    }

    console.log('Movie insertion and updates completed successfully')
  } catch (error) {
    console.error('Error processing movies:', error)
    throw error
  }
}

const getAllGarbageStrings = async () => {
  const garbageStrings = await prisma.garbageTitle.findMany({})
  return garbageStrings.map(garbageString => garbageString.title)
}

export const retrieveMovies = async () => {
  return await prisma.movie.findMany({})
}

export const getIdwithFilmId = async (
  filmId: string,
): Promise<string | null> => {
  const movie = await prisma.movie.findFirst({
    where: {
      movieIds: {
        has: filmId,
      },
    },
    select: {
      // Only select the id
      id: true,
    },
  })
  return movie ? movie.id : null // Return id if movie exists, otherwise null
}
