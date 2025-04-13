/**
 * Type definitions index file for the cinema scraper project
 *
 * This file exports all type definitions used throughout the project
 * and ensures compatibility between different type systems.
 */

// Re-export all types
export * from './cinema'
export * from './movie'
export * from './showtime'
export * from './standard'

// Import types for type augmentation
import {
  StandardMovie,
  StandardCinema,
  StandardShowtime,
  MergedMovie,
} from './standard'
import { Movie, TMDBMovie, MovieSource } from './movie'
import { Cinema, CinemaSource, CinemaMetadata } from './cinema'
import { Showtime, ShowtimeSource } from './showtime'

/**
 * Type guard to check if a movie is a StandardMovie
 * @param movie The movie to check
 * @returns True if the movie is a StandardMovie
 */
export function isStandardMovie(movie: any): movie is StandardMovie {
  return (
    typeof movie === 'object' &&
    typeof movie.id === 'string' &&
    typeof movie.filmTitle === 'string' &&
    typeof movie.language === 'string' &&
    typeof movie.format === 'string' &&
    typeof movie.source === 'object' &&
    typeof movie.source.chain === 'string' &&
    typeof movie.source.id === 'string'
  )
}

/**
 * Type guard to check if a cinema is a StandardCinema
 * @param cinema The cinema to check
 * @returns True if the cinema is a StandardCinema
 */
export function isStandardCinema(cinema: any): cinema is StandardCinema {
  return (
    typeof cinema === 'object' &&
    typeof cinema.id === 'string' &&
    typeof cinema.name === 'string' &&
    typeof cinema.searchableName === 'string' &&
    typeof cinema.source === 'object' &&
    typeof cinema.source.chain === 'string' &&
    typeof cinema.source.id === 'string'
  )
}

/**
 * Type guard to check if a showtime is a StandardShowtime
 * @param showtime The showtime to check
 * @returns True if the showtime is a StandardShowtime
 */
export function isStandardShowtime(
  showtime: any,
): showtime is StandardShowtime {
  return (
    typeof showtime === 'object' &&
    typeof showtime.id === 'string' &&
    typeof showtime.filmId === 'string' &&
    typeof showtime.cinemaId === 'string' &&
    typeof showtime.unixTime === 'number'
  )
}

/**
 * Convert a Movie to a StandardMovie
 * @param movie The movie to convert
 * @returns The converted StandardMovie
 */
export function toStandardMovie(movie: Movie): StandardMovie {
  return {
    id: movie.id,
    filmTitle: movie.filmTitle,
    language: movie.language || '',
    format: movie.format || '',
    source: movie.source || {
      chain: '',
      id: '',
      details: {},
    },
  }
}

/**
 * Convert a Cinema to a StandardCinema
 * @param cinema The cinema to convert
 * @returns The converted StandardCinema
 */
export function toStandardCinema(cinema: Cinema): StandardCinema {
  return {
    id: cinema.id,
    name: cinema.name,
    searchableName: cinema.searchableName,
    source: {
      chain: cinema.source.chain,
      id: cinema.source.id,
      details: cinema.source.details || cinema.source.chainSpecific || {},
    },
  }
}

/**
 * Convert a Showtime to a StandardShowtime
 * @param showtime The showtime to convert
 * @returns The converted StandardShowtime
 */
export function toStandardShowtime(showtime: Showtime): StandardShowtime {
  return {
    id: showtime.id,
    filmId: showtime.filmId,
    cinemaId: showtime.cinemaId,
    unixTime:
      showtime.unixTime ||
      (showtime.datetime ? showtime.datetime.getTime() / 1000 : 0),
    link: showtime.link || '',
    ticketType: showtime.ticketType || {
      label: '',
      type: '',
    },
    movieFormat: showtime.movieFormat || '',
    details: showtime.details || {},
  }
}
