import assert from 'assert';
import * as shawIndex from './index'; // Import all exports from index
import * as shawScrapers from './scrape'; // To mock getDateShowtimes
import { MovieShowtimeRaw, ShowTime, MovieShowtime } from './types';

// Original function storage
let originalGetDateShowtimes: any;

describe('Shaw Index - fetchShowtimes', () => {
  beforeEach(() => {
    // Store original function
    originalGetDateShowtimes = shawScrapers.getDateShowtimes;
  });

  afterEach(() => {
    // Restore original function using Object.defineProperty to ensure it's reset
    Object.defineProperty(shawScrapers, 'getDateShowtimes', {
      value: originalGetDateShowtimes,
      writable: true, // Or false if it should be strictly read-only after restore
      configurable: true,
    });
  });

  it('should fetch and flatten showtimes correctly over several days', async () => {
    const mockShowtime1: ShowTime = {
      performanceId: 1, displayDate: '2024-08-15', displayTime: '10:00', locationId: 101, locationVenueId: 1, locationVenueName: 'Shaw Lido', seatingStatus: 'available', isMidnight: false, locationVenueBrandCode: 'LIDO', formatCode: '2D', subtitleCode: 'EN', movieReleaseId: 1001, posterUrl: '', duration: 120, restrictionCode: 'PG', brandCode: 'SHAW', classifyCode: 'PG', primaryTitle: 'Movie Alpha Day 1', isDtsx: false,
    };
    const mockShowtime2: ShowTime = {
      performanceId: 2, displayDate: '2024-08-15', displayTime: '12:30', locationId: 101, locationVenueId: 1, locationVenueName: 'Shaw Lido', seatingStatus: 'available', isMidnight: false, locationVenueBrandCode: 'LIDO', formatCode: '2D', subtitleCode: 'EN', movieReleaseId: 1001, posterUrl: '', duration: 120, restrictionCode: 'PG', brandCode: 'SHAW', classifyCode: 'PG', primaryTitle: 'Movie Alpha Day 1', isDtsx: false,
    };
    const mockShowtime3: ShowTime = { // Different movie on Day 1
      performanceId: 3, displayDate: '2024-08-15', displayTime: '11:00', locationId: 102, locationVenueId: 2, locationVenueName: 'Shaw Nex', seatingStatus: 'limited', isMidnight: false, locationVenueBrandCode: 'NEX', formatCode: 'IMAX', subtitleCode: 'EN', movieReleaseId: 1002, posterUrl: '', duration: 150, restrictionCode: 'PG13', brandCode: 'SHAW', classifyCode: 'PG13', primaryTitle: 'Movie Beta Day 1', isDtsx: true,
    };
    const mockShowtime4: ShowTime = { // Same movie as mockShowtime1 but on Day 2
      performanceId: 4, displayDate: '2024-08-16', displayTime: '10:00', locationId: 101, locationVenueId: 1, locationVenueName: 'Shaw Lido', seatingStatus: 'available', isMidnight: false, locationVenueBrandCode: 'LIDO', formatCode: '2D', subtitleCode: 'EN', movieReleaseId: 1001, posterUrl: '', duration: 120, restrictionCode: 'PG', brandCode: 'SHAW', classifyCode: 'PG', primaryTitle: 'Movie Alpha Day 2', isDtsx: false,
    };


    const rawShowtimesDay1: MovieShowtimeRaw[] = [
      { movieId: 100, movieReleaseId: 1001, primaryTitle: 'Movie Alpha Day 1', posterUrl: 'alpha.jpg', duration: 120, classifyCode: 'PG', restrictionCode: 'PG', movieBrand: 'SHAW', showTimes: [mockShowtime1, mockShowtime2] },
      { movieId: 101, movieReleaseId: 1002, primaryTitle: 'Movie Beta Day 1', posterUrl: 'beta.jpg', duration: 150, classifyCode: 'PG13', restrictionCode: 'PG13', movieBrand: 'SHAW', showTimes: [mockShowtime3] },
    ];
    const rawShowtimesDay2: MovieShowtimeRaw[] = [
      { movieId: 100, movieReleaseId: 1001, primaryTitle: 'Movie Alpha Day 2', posterUrl: 'alpha.jpg', duration: 120, classifyCode: 'PG', restrictionCode: 'PG', movieBrand: 'SHAW', showTimes: [mockShowtime4] },
    ];
    const rawShowtimesDay3: MovieShowtimeRaw[] = []; // No showtimes for day 3

    let callCount = 0;
    const mockGetDateShowtimes = async (date: Date): Promise<MovieShowtimeRaw[]> => {
      callCount++;
      if (callCount === 1) return rawShowtimesDay1;
      if (callCount === 2) return rawShowtimesDay2;
      return rawShowtimesDay3; // For days 3-7
    };

    Object.defineProperty(shawScrapers, 'getDateShowtimes', {
      value: mockGetDateShowtimes,
      writable: true, // Allow this mock to be replaced by other tests if needed
      configurable: true,
    });

    const result = await shawIndex.fetchShowtimes();

    assert.strictEqual(callCount, 7, "getDateShowtimes should be called 7 times");

    const expected: MovieShowtime[] = [
      // Day 1 - Movie Alpha
      { movieId: 100, movieReleaseId: 1001, primaryTitle: 'Movie Alpha Day 1', posterUrl: 'alpha.jpg', duration: 120, classifyCode: 'PG', restrictionCode: 'PG', movieBrand: 'SHAW', ...mockShowtime1 },
      { movieId: 100, movieReleaseId: 1001, primaryTitle: 'Movie Alpha Day 1', posterUrl: 'alpha.jpg', duration: 120, classifyCode: 'PG', restrictionCode: 'PG', movieBrand: 'SHAW', ...mockShowtime2 },
      // Day 1 - Movie Beta
      { movieId: 101, movieReleaseId: 1002, primaryTitle: 'Movie Beta Day 1', posterUrl: 'beta.jpg', duration: 150, classifyCode: 'PG13', restrictionCode: 'PG13', movieBrand: 'SHAW', ...mockShowtime3 },
      // Day 2 - Movie Alpha
      { movieId: 100, movieReleaseId: 1001, primaryTitle: 'Movie Alpha Day 2', posterUrl: 'alpha.jpg', duration: 120, classifyCode: 'PG', restrictionCode: 'PG', movieBrand: 'SHAW', ...mockShowtime4 },
    ];

    assert.deepStrictEqual(result.length, expected.length, "Number of flattened showtimes should match expected");
    expected.forEach((expShowtime, index) => {
        assert.deepStrictEqual(result[index], expShowtime, `Showtime at index ${index} should match`);
    });
  });

  it('should return an empty array if getDateShowtimes always returns empty', async () => {
    const mockEmptyGetDateShowtimes = async (date: Date): Promise<MovieShowtimeRaw[]> => {
      return []; // Always return empty
    };

    Object.defineProperty(shawScrapers, 'getDateShowtimes', {
      value: mockEmptyGetDateShowtimes,
      writable: true,
      configurable: true,
    });

    const result = await shawIndex.fetchShowtimes();
    assert.deepStrictEqual(result, []);
  });
});
