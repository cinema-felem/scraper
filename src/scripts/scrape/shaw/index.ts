import { fetchSelectors, fetchCinemaList, getDateShowtimes } from './scrape'
import { Cinema, Movie, MovieShowtime, MovieShowtimeRaw } from './types'

export const fetchMovies = async (): Promise<Movie[]> => {
  const selectors = await fetchSelectors()
  const movieItems: any[] = selectors.filter((s: any) => s.type === 1)
  return movieItems.map((item: any) => ({
    movieReleaseId: Number(item.code),
    primaryTitle: item.name,
    formatCode: '',
    isLimited: false,
    isNewRelease: false,
    isExclusive: false,
    isSneakPreview: false,
    isAdvanceSales: false,
    releaseDate: new Date(),
    duration: 0,
    posterUrl: '',
    synopsisShort: '',
    classifyCode: '',
    adviceName: '',
    code: null,
  }))
}

export const fetchCinemas = async (): Promise<Cinema[]> => fetchCinemaList()

const flattenShowtimes = (
  exist: MovieShowtime[],
  newRecords: MovieShowtimeRaw[],
) => {
  if (!newRecords?.length) return exist
  for (const cinemaMovieShowtimes of newRecords) {
    const { showTimes: movieTimeslots, ...movieInfo } = cinemaMovieShowtimes
    for (const timeslot of movieTimeslots) {
      exist.push({ ...movieInfo, ...timeslot })
    }
  }
  return exist
}

export const fetchShowtimes = async (): Promise<MovieShowtime[]> => {
  const days = 7
  const queryDate = new Date()
  queryDate.setHours(0, 0, 0, 0)
  let showtimes: MovieShowtime[] = []

  for (let i = 0; i < days; i++) {
    const dayShowtimeObject: MovieShowtimeRaw[] = await getDateShowtimes(queryDate)
    showtimes = flattenShowtimes(showtimes, dayShowtimeObject)
    queryDate.setDate(queryDate.getDate() + 1)
  }
  return showtimes
}
