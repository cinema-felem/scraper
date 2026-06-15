import { GVMovies } from './types'
export const uniqByKeepFirst = (
  a: GVMovies[],
  key: (item: GVMovies) => string,
) => {
  const seen = new Set()
  return a.filter(item => {
    const k = key(item)
    return seen.has(k) ? false : seen.add(k)
  })
}
