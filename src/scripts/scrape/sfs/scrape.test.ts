import assert from 'assert'
import { parseSfsSessionLines } from './scrape'

describe('sfs scraper parsing', () => {
  it('extracts Peatix session lines with and without comma after month', () => {
    const html = `
      <meta content="Thurs 18 Jun, 7.30pm (SATURDAY NIGHT FEVER)"/>
      <meta content="Sat 20 Jun 7.30pm (BLUE VELVET)"/>
    `

    assert.deepStrictEqual(parseSfsSessionLines(html), [
      {
        day: '18',
        month: 'Jun',
        time: '7.30pm',
        filmTitle: 'SATURDAY NIGHT FEVER',
      },
      {
        day: '20',
        month: 'Jun',
        time: '7.30pm',
        filmTitle: 'BLUE VELVET',
      },
    ])
  })
})
