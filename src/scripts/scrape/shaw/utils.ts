import { Movie } from './types'

export const uniqByKeepFirst = (a: Movie[], key: (movie: Movie) => number) => {
  let seen = new Set()
  return a.filter(item => {
    let k = key(item)
    return seen.has(k) ? false : seen.add(k)
  })
}

//Partition function
export const partition = (
  array: Movie[],
  filter: (movie: Movie, index: number, movies: Movie[]) => boolean,
) => {
  let pass: Movie[] = [],
    fail: Movie[] = []
  array.forEach((e, idx, arr) => (filter(e, idx, arr) ? pass : fail).push(e))
  return [pass, fail]
}
