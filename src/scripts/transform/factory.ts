import { StandardCinema, StandardMovie } from '../../types/standard'
import { cleanString } from '../../text'

export interface CinemaFieldMapping<T> {
  chain: string
  getId: (raw: T) => string
  getName: (raw: T) => string
  getSearchableName?: (raw: T) => string
  getDetails: (raw: T) => Record<string, unknown>
}

export interface MovieFieldMapping<T> {
  chain: string
  getId: (raw: T) => string
  getTitle: (raw: T) => string
  getLanguage?: (raw: T) => string
  getFormat?: (raw: T) => string
  getDetails: (raw: T) => Record<string, unknown>
}

export function makeTransformCinemas<T>(mapping: CinemaFieldMapping<T>): (cinemas: T[]) => StandardCinema[] {
  return (cinemas: T[]) => cinemas.map(raw => {
    const name = cleanString(mapping.getName(raw))
    return {
      id: `${mapping.chain}:${mapping.getId(raw)}`,
      name,
      searchableName: mapping.getSearchableName ? cleanString(mapping.getSearchableName(raw)) : name,
      source: {
        chain: mapping.chain,
        id: mapping.getId(raw),
        details: mapping.getDetails(raw),
      },
    }
  })
}

export function makeTransformMovies<T>(mapping: MovieFieldMapping<T>): (movies: T[]) => StandardMovie[] {
  return (movies: T[]) => movies.map(raw => ({
    id: `${mapping.chain}:${mapping.getId(raw)}`,
    filmTitle: cleanString(mapping.getTitle(raw)),
    language: mapping.getLanguage ? (mapping.getLanguage(raw) || 'Unknown') : 'Unknown',
    format: mapping.getFormat ? (mapping.getFormat(raw) || '') : '',
    source: {
      chain: mapping.chain,
      id: mapping.getId(raw),
      details: mapping.getDetails(raw),
    },
  }))
}
