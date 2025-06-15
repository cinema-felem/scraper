import {
  flattenShowtimes as genericFlattenShowtimes,
  BaseTimeslot,
  FlattenedShowtime,
} from '../../transform/shared'
import {
  GVCinemaMovieShowtime, // Updated type name
  GVCinemaShowtime,
  RawCinemaShowtime,
  GVRawTimeslot, // Updated type name
} from './types'

// Define specific types for clarity if GVCinemaShowtime is not already the exact output type.
// GVCinemaShowtime is { cinemaId: string, filmCd: string (from GVCinemaMovieShowtime), ... movieInfo ..., ... timeslot ... }
// GVCinemaMovieShowtime is { filmCd: string, ... movieInfo ..., times: GVRawTimeslot[] }
// GVRawTimeslot is { hall: string, time12: string, etc. }

// The OutputContext for GV will be: { cinemaId: string } & Omit<GVCinemaMovieShowtime, 'times'>
type GVMovieContext = { cinemaId: string } & Omit<GVCinemaMovieShowtime, 'times'>;

export const flattenShowtimes = (
  rawCinemaShowtimes: RawCinemaShowtime[],
): GVCinemaShowtime[] => {
  if (!rawCinemaShowtimes || rawCinemaShowtimes.length === 0) return []

  let allFlattenedShowtimes: GVCinemaShowtime[] = []

  for (const cinemaData of rawCinemaShowtimes) {
    const cinemaId = cinemaData.id
    const moviesInCinema = cinemaData.movies // These are CinemaMovieShowtime[]

    // moviesInCinema serves as parentItems for genericFlattenShowtimes
    // RawTimeslot serves as TimeslotItem
    // GVMovieContext serves as OutputContext
    const flattenedForCinema = genericFlattenShowtimes<
      GVCinemaMovieShowtime, // Updated type
      GVRawTimeslot,       // Updated type
      GVMovieContext
    >(
      moviesInCinema,
      movie => movie.times, // getTimeslots
      movie => {
        // getContext
        const { times, ...movieInfo } = movie
        return { cinemaId, ...movieInfo }
      },
    )
    // The type of flattenedForCinema is Array<FlattenedShowtime<GVMovieContext, RawTimeslot>>
    // which should be compatible with GVCinemaShowtime[]
    allFlattenedShowtimes = allFlattenedShowtimes.concat(
      flattenedForCinema as GVCinemaShowtime[],
    )
  }
  return allFlattenedShowtimes
}
