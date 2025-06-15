import { sortTMDBResults, TMDBSearchResult } from '../tmdb'
import { getEditDistance } from '../../../../text'

jest.mock('../../../../text', () => ({
  getEditDistance: jest.fn(),
}))

const mockGetEditDistance = getEditDistance as jest.Mock

describe('sortTMDBResults', () => {
  const baseMovie: Omit<TMDBSearchResult, 'id' | 'title' | 'release_date' | 'popularity' | 'original_title'> = {
    genre_ids: [1],
    overview: 'Overview',
    poster_path: 'poster.jpg',
    video: false,
    vote_average: 7,
    vote_count: 100,
    original_language: 'en',
    backdrop_path: 'backdrop.jpg',
    adult: false,
  }

  // Helper function to create a date string YYYY-MM-DD
  const d = (date: Date): string => date.toISOString().split('T')[0]
  const now = new Date()
  const oneMonthAgo = new Date(new Date(now).setMonth(now.getMonth() - 1))
  const twoMonthsAgo = new Date(new Date(now).setMonth(now.getMonth() - 2))
  const fourMonthsAgo = new Date(new Date(now).setMonth(now.getMonth() - 4))
  const oneYearAgo = new Date(new Date(now).setFullYear(now.getFullYear() - 1))
  const twoYearsAgo = new Date(new Date(now).setFullYear(now.getFullYear() - 2))

  beforeEach(() => {
    // Reset the mock before each test
    mockGetEditDistance.mockReset()
  })

  test('Test Case 1: Prioritize recent movies', () => {
    mockGetEditDistance.mockReturnValue(1) // Same edit distance for all

    const movies: TMDBSearchResult[] = [
      { ...baseMovie, id: 1, title: 'Movie A (4 months ago)', original_title: 'Movie A (4 months ago)', release_date: d(fourMonthsAgo), popularity: 100 },
      { ...baseMovie, id: 2, title: 'Movie B (1 year ago)', original_title: 'Movie B (1 year ago)', release_date: d(oneYearAgo), popularity: 200 },
      { ...baseMovie, id: 3, title: 'Movie C (1 month ago)', original_title: 'Movie C (1 month ago)', release_date: d(oneMonthAgo), popularity: 50 },
      { ...baseMovie, id: 4, title: 'Movie D (2 months ago)', original_title: 'Movie D (2 months ago)', release_date: d(twoMonthsAgo), popularity: 150 },
    ]

    const sorted = sortTMDBResults('Any Movie', movies)

    // Recent movies:
    // Movie C (id:3, 1 month ago, pop 50)
    // Movie D (id:4, 2 months ago, pop 150)
    // Both recent, same edit distance (1). Date diff is < 365 days. Sorted by popularity desc. So D (150) then C (50) -> [4, 3]
    // Older movies:
    // Movie A (id:1, 4 months ago, pop 100)
    // Movie B (id:2, 1 year ago, pop 200)
    // Both old, same edit distance (1). Date diff is < 365 days (approx 245). Sorted by popularity desc. So B (200) then A (100) -> [2, 1]
    // Overall: [4, 3, 2, 1]
    expect(sorted.map((m: TMDBSearchResult) => m.id)).toEqual([4, 3, 2, 1])
  })

  test('Test Case 2: Handle movies without release dates', () => {
    mockGetEditDistance.mockReturnValue(1) // Same edit distance

    const movies: TMDBSearchResult[] = [
      { ...baseMovie, id: 1, title: 'Movie A (No Date)', original_title: 'Movie A (No Date)', release_date: '', popularity: 100 },
      { ...baseMovie, id: 2, title: 'Movie B (1 month ago)', original_title: 'Movie B (1 month ago)', release_date: d(oneMonthAgo), popularity: 200 },
      { ...baseMovie, id: 3, title: 'Movie C (No Date, High Pop)', original_title: 'Movie C (No Date, High Pop)', release_date: null as any, popularity: 300 },
      { ...baseMovie, id: 4, title: 'Movie D (4 months ago)', original_title: 'Movie D (4 months ago)', release_date: d(fourMonthsAgo), popularity: 50 },
    ]
    const sorted = sortTMDBResults('Any Movie', movies)
    // Expected: Recent (2), then older with date (4), then no dates (1,3 sorted by popularity)
    expect(sorted.map((m: TMDBSearchResult) => m.id)).toEqual([2, 4, 3, 1])
    // 2 is recent, 4 is not. 2 comes first.
    // 4 has date, 1 and 3 do not. 4 comes before 1 and 3.
    // For 1 vs 3: neither recent, neither has date. Sorted by popularity (300 > 100). So 3 comes before 1. Correct.
  })

  test('Test Case 3: Secondary sorting (popularity/release date for older movies)', () => {
    mockGetEditDistance.mockReturnValue(1) // Same edit distance for all

    const movieOlder1 = { ...baseMovie, id: 1, title: 'Older Movie A (1 year ago, pop 100)', original_title: 'Older Movie A (1 year ago, pop 100)', release_date: d(oneYearAgo), popularity: 100 }
    const movieOlder2 = { ...baseMovie, id: 2, title: 'Older Movie B (2 years ago, pop 200)', original_title: 'Older Movie B (2 years ago, pop 200)', release_date: d(twoYearsAgo), popularity: 200 }
    const movieOlder3 = { ...baseMovie, id: 3, title: 'Older Movie C (1 year ago, pop 50)', original_title: 'Older Movie C (1 year ago, pop 50)', release_date: d(new Date(new Date(oneYearAgo).setDate(oneYearAgo.getDate() - 10))), popularity: 50 } // 1 year and 10 days ago

    const movies1: TMDBSearchResult[] = [movieOlder1, movieOlder2] // Dates far apart (>365 days)
    const sorted1 = sortTMDBResults('Any Movie', movies1)
    expect(sorted1.map((m: TMDBSearchResult) => m.id)).toEqual([1, 2]) // Sorted by release date (1 year ago before 2 years ago)

    const movies2: TMDBSearchResult[] = [movieOlder1, movieOlder3] // Dates close (<365 days)
    const sorted2 = sortTMDBResults('Any Movie', movies2)
    expect(sorted2.map((m: TMDBSearchResult) => m.id)).toEqual([1, 3]) // Sorted by popularity (100 > 50)
  })

  test('Test Case 4: Secondary sorting (title similarity)', () => {
    const movieRecent1 = { ...baseMovie, id: 1, title: 'Recent Alpha', original_title: 'Recent Alpha', release_date: d(oneMonthAgo), popularity: 100 }
    const movieRecent2 = { ...baseMovie, id: 2, title: 'Recent Beta', original_title: 'Recent Beta', release_date: d(twoMonthsAgo), popularity: 200 }
    const movieOld1 = { ...baseMovie, id: 3, title: 'Old Gamma', original_title: 'Old Gamma', release_date: d(oneYearAgo), popularity: 100 }
    const movieOld2 = { ...baseMovie, id: 4, title: 'Old Delta', original_title: 'Old Delta', release_date: d(twoYearsAgo), popularity: 200 }

    mockGetEditDistance.mockImplementation((searchTerm, title) => {
      if (title === 'Recent Alpha') return 1
      if (title === 'Recent Beta') return 5
      if (title === 'Old Gamma') return 2
      if (title === 'Old Delta') return 4
      return 10
    })

    const movies: TMDBSearchResult[] = [movieRecent1, movieRecent2, movieOld1, movieOld2]
    const sorted = sortTMDBResults('Any Movie', movies)

    // Expected:
    // Recent movies first: [Recent Alpha (dist 1), Recent Beta (dist 5)] -> Alpha comes first due to edit distance
    // Old movies next: [Old Gamma (dist 2), Old Delta (dist 4)] -> Gamma comes first
    // Overall: Recent Alpha, Recent Beta, Old Gamma, Old Delta
    // Recent: Movie1 (dist 1), Movie2 (dist 5). dist diff=4. Sort by dist: 1 then 2. -> [1, 2]
    // Old: Movie3 (dist 2), Movie4 (dist 4). dist diff=2 (<5). Dates far apart. Sort by date desc: 3 then 4. -> [3, 4]
    expect(sorted.map((m: TMDBSearchResult) => m.id)).toEqual([1, 2, 3, 4])

    // Test with different edit distances for recent movies
    // Movie1 (Recent Alpha, dist 5), Movie2 (Recent Beta, dist 1)
    // Movie3 (Old Gamma, dist 2), Movie4 (Old Delta, dist 4)
    mockGetEditDistance.mockImplementation((searchTerm, title) => {
        if (title === 'Recent Alpha') return 5 // Movie1, Worse distance
        if (title === 'Recent Beta') return 1  // Movie2, Better distance
        if (title === 'Old Gamma') return 2    // Movie3
        if (title === 'Old Delta') return 4    // Movie4
        return 10
    })
    const sorted2 = sortTMDBResults('Any Movie', [movieRecent1, movieRecent2, movieOld1, movieOld2])
    // Recent: Movie2 (dist 1), Movie1 (dist 5). dist diff=4. Sort by dist: 2 then 1. -> [2, 1]
    // Old: Movie3 (dist 2), Movie4 (dist 4). dist diff=2 (<5). Dates far apart. Sort by date desc: 3 then 4. -> [3, 4]
    // Overall: [2, 1, 3, 4]
    expect(sorted2.map((m: TMDBSearchResult) => m.id)).toEqual([2, 1, 3, 4])

     // Test when edit distances are the same for recent, different for old
    // Movie1 (Recent Alpha, pop 100, 1 month ago, dist 1)
    // Movie2 (Recent Beta, pop 200, 2 months ago, dist 1)
    // Movie3 (Old Gamma, pop 100, 1 year ago, dist 4)
    // Movie4 (Old Delta, pop 200, 2 years ago, dist 2)
    mockGetEditDistance.mockImplementation((searchTerm, title) => {
        if (title.startsWith('Recent')) return 1 // Movie1, Movie2
        if (title === 'Old Gamma') return 4    // Movie3
        if (title === 'Old Delta') return 2    // Movie4, better distance
        return 10
    })
    const sorted3 = sortTMDBResults('Any Movie', [movieRecent1, movieRecent2, movieOld1, movieOld2])
    // Recent (both dist 1): Movie1 (pop 100), Movie2 (pop 200). Dates <365 days apart. Sort by pop desc: Movie2 then Movie1. -> [2, 1]
    // Old: Movie4 (dist 2), Movie3 (dist 4). dist diff=2 (<5). Dates far apart. Sort by date desc: Movie4 then Movie3. -> [4, 3]
    // Overall: [2, 1, 4, 3]
    expect(sorted3.map((m: TMDBSearchResult) => m.id)).toEqual([2, 1, 4, 3])
  })
})
