import { GVCinemaShowtime, RawCinemaShowtime } from './types'

export const flattenShowtimes = (
  newRecords: RawCinemaShowtime[],
): GVCinemaShowtime[] => {
  if (newRecords.length === 0) return []
  const flatShowtime: GVCinemaShowtime[] = []
  for (const cinemaShowtimes of newRecords) {
    const { id, movies } = cinemaShowtimes
    for (const cinemaMovieShowtimes of movies) {
      const { times: movieTimeslots, ...movieInfo } = cinemaMovieShowtimes
      for (const timeslot of movieTimeslots) {
        const movieTimeslotContext: GVCinemaShowtime = {
          cinemaId: id,
          ...movieInfo,
          ...timeslot,
        }
        flatShowtime.push(movieTimeslotContext)
      }
    }
  }
  return flatShowtime
}
