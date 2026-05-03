import { StandardCinema, StandardMovie, StandardShowtime, ChainTransformResult } from '@/types/standard'
import logger from '@/utils/logger'

export abstract class BaseTransformer {
  abstract readonly chain: string

  abstract transformMovies(movies: unknown[]): StandardMovie[]
  abstract transformCinemas(cinemas: unknown[]): StandardCinema[]
  abstract transformShowtimes(showtimes: unknown[]): StandardShowtime[]

  standardiseCinemaChain(raw: { movies: unknown[], cinemas: unknown[], showtimes: unknown[] }): ChainTransformResult {
    const movies = this.transformMovies(raw.movies ?? [])
    const cinemas = this.transformCinemas(raw.cinemas ?? [])
    const showtimes = this.transformShowtimes(raw.showtimes ?? [])
    logger.trackDataCounts({
      stage: `transform_${this.chain}`,
      movieCount: movies.length,
      cinemaCount: cinemas.length,
      showtimeCount: showtimes.length,
      source: this.chain,
    })
    return { movies, cinemas, showtimes }
  }
}
