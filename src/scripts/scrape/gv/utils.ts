import { GVMovies } from './types'
export const uniqByKeepFirst = (
  a: GVMovies[],
  key: (item: GVMovies) => string,
) => {
  let seen = new Set()
  return a.filter(item => {
    let k = key(item)
    return seen.has(k) ? false : seen.add(k)
  })
}
