import { ProcessedMovie } from '@/scripts/metadata/wrapper/tmdb'
import { Movie as PrismaMovie, PrismaClient } from '@prisma/client'

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
  await upsertTMDb(tmdbMovie)
  return await updateMovieTMDBId(movie, Number(tmdbMovie.external_ids.tmdb_id))
}

const updateMovieTMDBId = async (movie: PrismaMovie, tmdbId: number) => {
  const { id, title } = movie

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
