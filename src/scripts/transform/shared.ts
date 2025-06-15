/**
 * Base interface for a timeslot.
 * Scraper-specific timeslot types should extend this.
 */
export interface BaseTimeslot {
  [key: string]: any // Common properties: time, url, availability, etc.
}

/**
 * Represents the output structure of a flattened showtime.
 * It should include context from the parent (like movie/cinema info)
 * and the timeslot details.
 */
export type FlattenedShowtime<
  ParentContext extends Record<string, any>,
  T extends BaseTimeslot,
> = ParentContext & T

/**
 * A generic function to flatten showtimes from a list of parent items.
 * Each parent item (e.g., a movie showing at a specific cinema) contains multiple timeslots.
 * This function iterates through each parent item, then through each of its timeslots,
 * and creates a new object combining the parent's context with the timeslot's details.
 *
 * @template ParentItem - The type of the items in the input array (e.g., an object representing a movie with its showtimes at a location).
 * @template TimeslotItem - The type of the individual timeslot objects (should extend BaseTimeslot).
 * @template OutputContext - The type of the context extracted from the ParentItem to be merged with each TimeslotItem.
 *
 * @param {ParentItem[]} parentItems - An array of items, each containing showtime information and other contextual data.
 * @param {(parent: ParentItem) => TimeslotItem[]} getTimeslots - A function that takes a parentItem and returns an array of its TimeslotItems.
 * @param {(parent: ParentItem) => OutputContext} getContext - A function that takes a parentItem and returns the context (e.g., movie details, cinema details) to be merged with each timeslot.
 * @returns {Array<FlattenedShowtime<OutputContext, TimeslotItem>>} A new array of flattened showtime objects.
 */
export function flattenShowtimes<
  ParentItem extends Record<string, any>,
  TimeslotItem extends BaseTimeslot,
  OutputContext extends Record<string, any>,
>(
  parentItems: ParentItem[] | undefined | null,
  getTimeslots: (parent: ParentItem) => TimeslotItem[] | undefined | null,
  getContext: (parent: ParentItem) => OutputContext,
): Array<FlattenedShowtime<OutputContext, TimeslotItem>> {
  const flattenedResult: Array<FlattenedShowtime<OutputContext, TimeslotItem>> =
    []

  if (!parentItems) {
    return flattenedResult
  }

  for (const parent of parentItems) {
    const context = getContext(parent)
    const timeslots = getTimeslots(parent)

    if (timeslots) {
      for (const timeslot of timeslots) {
        flattenedResult.push({
          ...context,
          ...timeslot,
        })
      }
    }
  }

  return flattenedResult
}

// Example Usage (conceptual, actual types would be more specific):
/*
interface GVCinemaMovie { // Example ParentItem for GV
  movieId: string;
  movieTitle: string;
  rating: string;
  // ... other movie details
  times: GVTimeslot[]; // Array of timeslots
  // cinemaId is not here, it's one level above, so getContext for GV would need to handle that.
}

interface GVTimeslot extends BaseTimeslot { // Example TimeslotItem for GV
  time: string;
  availability: string;
}

// GV specific transform might look like:
// const rawCinemaShowtimes: RawCinemaShowtime[] = ...; // This is [{ id: cinemaId, movies: GVCinemaMovie[] }]
// let allFlattenedShowtimes: FlattenedShowtime<any, GVTimeslot>[] = [];
// for (const cinema of rawCinemaShowtimes) {
//   const cinemaContext = { cinemaId: cinema.id };
//   const movieShowtimesForCinema = cinema.movies; // These are like ParentItem
//
//   const flattenedForCinema = flattenShowtimes<GVCinemaMovie, GVTimeslot, { cinemaId: string } & Omit<GVCinemaMovie, 'times'>>(
//     movieShowtimesForCinema,
//     (movie) => movie.times,
//     (movie) => {
//       const { times, ...movieInfo } = movie;
//       return { ...cinemaContext, ...movieInfo };
//     }
//   );
//   allFlattenedShowtimes = allFlattenedShowtimes.concat(flattenedForCinema);
// }

interface ShawMovieShowtimeRaw { // Example ParentItem for Shaw
  movieId: string;
  movieTitle: string;
  cinemaId: string;
  // ... other movie and cinema details
  showTimes: ShawTimeslot[]; // Array of timeslots
}

interface ShawTimeslot extends BaseTimeslot { // Example TimeslotItem for Shaw
  startTime: string;
  bookingLink: string;
}

// Shaw specific transform might look like:
// const shawRawShowtimes: ShawMovieShowtimeRaw[] = ...; // These are ParentItem
// const flattenedForShaw = flattenShowtimes<ShawMovieShowtimeRaw, ShawTimeslot, Omit<ShawMovieShowtimeRaw, 'showTimes'>>(
//   shawRawShowtimes,
//   (rawShowtime) => rawShowtime.showTimes,
//   (rawShowtime) => {
//     const { showTimes, ...context } = rawShowtime;
//     return context;
//   }
// );
*/
