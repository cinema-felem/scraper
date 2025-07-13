import { ProcessedMovie } from '@/scripts/metadata/wrapper/tmdb'
import { Movie as PrismaMovie, PrismaClient } from '@prisma/client'
import logger from '@/utils/logger'

const prisma = new PrismaClient()

export const retrieveTMDB = async (tmdbId: number) => {
  const result = await prisma.tmdb.findFirst({
    where: {
      id: tmdbId,
    },
  })
  return result
}

export const updateMovieTMDB = async (
  movie: PrismaMovie,
  tmdbMovie: ProcessedMovie,
) => {
  if (!tmdbMovie?.external_ids?.tmdb_id) return
  
  try {
    await upsertTMDb(tmdbMovie)
    return await updateMovieTMDBId(movie, Number(tmdbMovie.external_ids.tmdb_id))
  } catch (error) {
    logger.error(`Error updating movie TMDB data for "${movie.title}":`, error)
    // Return the original movie if update fails
    return movie
  }
}

const updateMovieTMDBId = async (movie: PrismaMovie, tmdbId: number) => {
  const { id, title } = movie

  // First check if another movie already has this tmdbId
  const existingMovieWithTMDBId = await prisma.movie.findFirst({
    where: {
      tmdbId,
      id: { not: id }, // Exclude the current movie
    },
  })

  if (existingMovieWithTMDBId) {
    // Another movie already has this tmdbId, skip the update
    logger.warn(
      `Skipping tmdbId update for movie "${title}" (ID: ${id}) - tmdbId ${tmdbId} already exists on movie "${existingMovieWithTMDBId.title}" (ID: ${existingMovieWithTMDBId.id})`
    )
    return movie
  }

  return prisma.movie.update({
    where: {
      id,
      title,
    },
    data: {
      tmdbId,
    },
  })
}

/**
 * Upserts TMDB movie data into the database
 * @param {ProcessedMovie} tmdbMovie - The processed movie data from TMDB
 * @returns {Promise<void>}
 */
const upsertTMDb = async (tmdbMovie: any) => {
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
}
