export function uniqByKeepFirst<T>(items: T[], key: (item: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return items.filter(item => {
    const k = key(item)
    return seen.has(k) ? false : seen.add(k)
  })
}

export function partition<T>(items: T[], pred: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = []
  const fail: T[] = []
  for (const item of items) {
    (pred(item) ? pass : fail).push(item)
  }
  return [pass, fail]
}
