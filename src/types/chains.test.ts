import assert from 'assert'
import { CINEMA_CHAINS } from './chains'

describe('cinema chain registry', () => {
  it('contains the six cinema chains supported by the default pipeline', () => {
    assert.deepStrictEqual(CINEMA_CHAINS, [
      'gv',
      'shaw',
      'carnival',
      'eaglewing',
      'filmhouse',
      'sfs',
    ])
  })
})
