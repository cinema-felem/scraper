import assert from 'assert'
import { standardiseCinemaChain } from '../gv'
import fixture from './fixtures/gv.json'

describe('gv transform', () => {
  const result = standardiseCinemaChain(fixture as Parameters<typeof standardiseCinemaChain>[0])

  it('all movie ids are prefixed with gv:', () => {
    assert(result.movies.every(m => m.id.startsWith('gv:')))
  })

  it('all cinema ids are prefixed with gv:', () => {
    assert(result.cinemas.every(c => c.id.startsWith('gv:')))
  })

  it('all showtimes have positive unixTime', () => {
    assert(result.showtimes.every(s => s.unixTime > 0))
  })

  it('all showtime filmIds reference a movie in output', () => {
    const ids = new Set(result.movies.map(m => m.id))
    assert(result.showtimes.every(s => ids.has(s.filmId)))
  })

  it('all showtime cinemaIds reference a cinema in output', () => {
    const ids = new Set(result.cinemas.map(c => c.id))
    assert(result.showtimes.every(s => ids.has(s.cinemaId)))
  })
})
