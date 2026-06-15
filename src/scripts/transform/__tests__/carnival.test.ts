import assert from 'assert'
import { standardiseCinemaChain } from '../carnival'

describe('carnival transform', () => {
  it('normalizes showtimes with trailing upstream flags after AM/PM', () => {
    const result = standardiseCinemaChain({
      movies: [
        {
          code: 'Habeebi ',
          name: 'Habeebi',
          censor: '',
          language: 'Tamil',
          duration: 0,
          genre: '',
          openingDate: '',
        },
      ],
      cinemas: [
        {
          id: 'golden-mile-tower',
          name: 'Carnival Cinema Golden Mile Tower',
          address: 'Golden Mile Tower',
        },
      ],
      showtimes: [
        {
          movieCode: 'Habeebi ',
          date: '2026-06-14',
          groups: [
            {
              cinemaName: 'Carnival Cinema Golden Mile Tower',
              cinemaAddress: 'Golden Mile Tower',
              sessions: [
                {
                  showId: '35272',
                  showTime: '08:30 PMF',
                  format: '2D',
                  screen: '',
                  bookingLink: 'https://carnivalcinemas.sg/',
                },
              ],
            },
          ],
        },
      ],
    })

    assert.strictEqual(result.showtimes.length, 1)
    assert(result.showtimes[0].unixTime > 0)
  })
})
