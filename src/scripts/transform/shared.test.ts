import assert from 'assert';
import { flattenShowtimes, BaseTimeslot } from './shared';

interface TestTimeslot extends BaseTimeslot {
  time: string;
  id: number;
}

interface TestParentItem {
  parentId: string;
  movieTitle: string;
  // Using a different name for timeslots array to test flexibility
  schedules: TestTimeslot[];
  // Extra property not part of context
  internalFlag?: boolean;
}

interface TestContext {
  pId: string; // Renamed from parentId for testing context mapping
  title: string; // Renamed from movieTitle
}

// Expected output structure
type TestFlattenedShowtime = TestContext & TestTimeslot;

describe('Shared Transformers - flattenShowtimes', () => {
  it('should return an empty array if parentItems is null or undefined', () => {
    const getTimeslots = (parent: TestParentItem) => parent.schedules;
    const getContext = (parent: TestParentItem): TestContext => ({ pId: parent.parentId, title: parent.movieTitle });
    assert.deepStrictEqual(flattenShowtimes(null, getTimeslots, getContext), []);
    assert.deepStrictEqual(flattenShowtimes(undefined, getTimeslots, getContext), []);
  });

  it('should return an empty array if parentItems is empty', () => {
    const getTimeslots = (parent: TestParentItem) => parent.schedules;
    const getContext = (parent: TestParentItem): TestContext => ({ pId: parent.parentId, title: parent.movieTitle });
    assert.deepStrictEqual(flattenShowtimes([], getTimeslots, getContext), []);
  });

  it('should correctly flatten showtimes with valid inputs', () => {
    const parentItems: TestParentItem[] = [
      {
        parentId: 'p1',
        movieTitle: 'Movie 1',
        schedules: [
          { time: '10:00', id: 1 },
          { time: '12:00', id: 2 },
        ],
        internalFlag: true,
      },
      {
        parentId: 'p2',
        movieTitle: 'Movie 2',
        schedules: [{ time: '14:00', id: 3 }],
      },
    ];

    const getTimeslots = (parent: TestParentItem) => parent.schedules;
    const getContext = (parent: TestParentItem): TestContext => ({ pId: parent.parentId, title: parent.movieTitle });

    const expected: TestFlattenedShowtime[] = [
      { pId: 'p1', title: 'Movie 1', time: '10:00', id: 1 },
      { pId: 'p1', title: 'Movie 1', time: '12:00', id: 2 },
      { pId: 'p2', title: 'Movie 2', time: '14:00', id: 3 },
    ];

    const result = flattenShowtimes(parentItems, getTimeslots, getContext);
    assert.deepStrictEqual(result, expected);
  });

  it('should handle cases where getTimeslots returns null or an empty array for some items', () => {
    const parentItems: TestParentItem[] = [
      { parentId: 'p1', movieTitle: 'Movie 1', schedules: [{ time: '10:00', id: 1 }] },
      { parentId: 'p2', movieTitle: 'Movie 2', schedules: null as any }, // Test null case
      { parentId: 'p3', movieTitle: 'Movie 3', schedules: [] }, // Test empty array case
      { parentId: 'p4', movieTitle: 'Movie 4', schedules: [{ time: '12:00', id: 2 }] },
    ];

    const getTimeslots = (parent: TestParentItem) => parent.schedules;
    const getContext = (parent: TestParentItem): TestContext => ({ pId: parent.parentId, title: parent.movieTitle });

    const expected: TestFlattenedShowtime[] = [
      { pId: 'p1', title: 'Movie 1', time: '10:00', id: 1 },
      { pId: 'p4', title: 'Movie 4', time: '12:00', id: 2 },
    ];

    const result = flattenShowtimes(parentItems, getTimeslots, getContext);
    assert.deepStrictEqual(result, expected);
  });

  it('should handle if getContext returns an empty object', () => {
    const parentItems: TestParentItem[] = [
      {
        parentId: 'p1',
        movieTitle: 'Movie 1',
        schedules: [{ time: '10:00', id: 1 }],
      },
    ];
    const getTimeslots = (parent: TestParentItem) => parent.schedules;
    // getContext returns an empty object
    const getContext = (parent: TestParentItem): {} => ({});

    const expected: TestTimeslot[] = [{ time: '10:00', id: 1 }]; // Context is empty

    const result = flattenShowtimes(parentItems, getTimeslots, getContext);
    assert.deepStrictEqual(result, expected);
  });
});
