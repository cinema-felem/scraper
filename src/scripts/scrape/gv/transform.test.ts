import assert from 'assert';
import { flattenShowtimes as gvFlattenShowtimes } from './transform';
import { RawCinemaShowtime, GVCinemaMovieShowtime, GVRawTimeslot, GVCinemaShowtime } from './types';

describe('GV Transformer - flattenShowtimes', () => {
  it('should return an empty array if rawCinemaShowtimes is null or undefined or empty', () => {
    assert.deepStrictEqual(gvFlattenShowtimes(null as any), []);
    assert.deepStrictEqual(gvFlattenShowtimes(undefined as any), []);
    assert.deepStrictEqual(gvFlattenShowtimes([]), []);
  });

  it('should correctly transform RawCinemaShowtime data to GVCinemaShowtime array', () => {
    const mockRawTimeslot1: GVRawTimeslot = {
      showDate: '2024-08-15',
      time12: '02:30PM',
      time24: '1430',
      soldPercent: 20,
      hall: 'Hall 1',
      concessionAllow: true,
      increasedCapacity: { increasedCapacity: false, promptMessage: '' },
    };
    const mockRawTimeslot2: GVRawTimeslot = {
      showDate: '2024-08-15',
      time12: '05:00PM',
      time24: '1700',
      soldPercent: 50,
      hall: 'Hall 2',
      concessionAllow: false,
      increasedCapacity: { increasedCapacity: true, promptMessage: 'Full' },
    };

    const mockMovie1: GVCinemaMovieShowtime = {
      filmCd: 'GV001',
      filmTitle: 'Movie Alpha',
      rating: 'PG13',
      ratingImgUrl: 'pg13.png',
      consumerAdvice: 'Some violence',
      priorityBkgFlg: false,
      subTitles: ['English', 'Chinese'],
      times: [mockRawTimeslot1, mockRawTimeslot2],
    };

    const mockRawTimeslot3: GVRawTimeslot = {
      showDate: '2024-08-15',
      time12: '08:00PM',
      time24: '2000',
      soldPercent: 10,
      hall: 'Hall 3',
      concessionAllow: true,
      increasedCapacity: { increasedCapacity: false, promptMessage: '' },
    };
    const mockMovie2: GVCinemaMovieShowtime = {
      filmCd: 'GV002',
      filmTitle: 'Movie Beta',
      rating: 'NC16',
      ratingImgUrl: 'nc16.png',
      consumerAdvice: 'Horror',
      priorityBkgFlg: true,
      subTitles: ['English'],
      times: [mockRawTimeslot3],
    };

    const mockRawCinemaShowtimes: RawCinemaShowtime[] = [
      {
        id: 'gv_cinema_1', // cinemaId
        movies: [mockMovie1],
      },
      {
        id: 'gv_cinema_2',
        movies: [mockMovie2],
      },
      {
        id: 'gv_cinema_3', // Cinema with no movies
        movies: [],
      }
    ];

    const expected: GVCinemaShowtime[] = [
      {
        cinemaId: 'gv_cinema_1',
        filmCd: 'GV001',
        filmTitle: 'Movie Alpha',
        rating: 'PG13',
        ratingImgUrl: 'pg13.png',
        consumerAdvice: 'Some violence',
        priorityBkgFlg: false,
        subTitles: ['English', 'Chinese'],
        // from mockRawTimeslot1
        showDate: '2024-08-15',
        time12: '02:30PM',
        time24: '1430',
        soldPercent: 20,
        hall: 'Hall 1',
        concessionAllow: true,
        increasedCapacity: { increasedCapacity: false, promptMessage: '' },
      },
      {
        cinemaId: 'gv_cinema_1',
        filmCd: 'GV001',
        filmTitle: 'Movie Alpha',
        rating: 'PG13',
        ratingImgUrl: 'pg13.png',
        consumerAdvice: 'Some violence',
        priorityBkgFlg: false,
        subTitles: ['English', 'Chinese'],
        // from mockRawTimeslot2
        showDate: '2024-08-15',
        time12: '05:00PM',
        time24: '1700',
        soldPercent: 50,
        hall: 'Hall 2',
        concessionAllow: false,
        increasedCapacity: { increasedCapacity: true, promptMessage: 'Full' },
      },
      {
        cinemaId: 'gv_cinema_2',
        filmCd: 'GV002',
        filmTitle: 'Movie Beta',
        rating: 'NC16',
        ratingImgUrl: 'nc16.png',
        consumerAdvice: 'Horror',
        priorityBkgFlg: true,
        subTitles: ['English'],
        // from mockRawTimeslot3
        showDate: '2024-08-15',
        time12: '08:00PM',
        time24: '2000',
        soldPercent: 10,
        hall: 'Hall 3',
        concessionAllow: true,
        increasedCapacity: { increasedCapacity: false, promptMessage: '' },
      },
    ];

    const result = gvFlattenShowtimes(mockRawCinemaShowtimes);
    assert.deepStrictEqual(result, expected);
  });

  it('should handle movies with no timeslots', () => {
    const mockMovieWithNoTimeslots: GVCinemaMovieShowtime = {
      filmCd: 'GV003',
      filmTitle: 'Movie Gamma',
      rating: 'G',
      ratingImgUrl: 'g.png',
      consumerAdvice: 'General',
      priorityBkgFlg: false,
      subTitles: ['English'],
      times: [], // No timeslots
    };
    const mockRawCinemaShowtimes: RawCinemaShowtime[] = [
      {
        id: 'gv_cinema_4',
        movies: [mockMovieWithNoTimeslots],
      },
    ];
    const result = gvFlattenShowtimes(mockRawCinemaShowtimes);
    assert.deepStrictEqual(result, []);
  });
});
