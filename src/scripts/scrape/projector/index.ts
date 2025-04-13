import { PageData } from './gql-types'
import {
  fetchFilmPageData,
  fetchMovieDetails,
  fetchShowtimesApi,
} from './scrape'
import { Cinema, Movie, Screening } from './types'

const fetchCinemas = async (): Promise<Cinema[]> => {
  const filmPageResponse = await fetchFilmPageData()
  if (
    filmPageResponse &&
    filmPageResponse?.path === '/films/' &&
    filmPageResponse?.result &&
    filmPageResponse?.result?.data?.locations?.edges?.length > 0
  ) {
    const gqlLocations = filmPageResponse?.result?.data?.locations?.edges
    const locationList: Cinema[] = gqlLocations.map(gqlLocation => {
      const { fields, frontmatter } = gqlLocation?.node
      const { venues: gqlVenues } = fields
      const venues = gqlVenues
        ? gqlVenues.map(gqlVenue => {
            const { frontmatter } = gqlVenue
            return {
              title: frontmatter?.title,
              screens: frontmatter?.screens,
              accessibility: frontmatter?.accessibility,
            }
          })
        : []

      const location: Cinema = {
        title: frontmatter.title,
        veeziToken: frontmatter.veeziToken,
        venues,
      }
      return location
    })
    return locationList
  } else {
    return []
  }
}

const fetchMovies = async () => {
  const filmPageResponse = await fetchFilmPageData()

  if (
    filmPageResponse &&
    filmPageResponse?.path === '/films/' &&
    filmPageResponse?.result &&
    filmPageResponse?.result?.data?.films?.edges?.length > 0
  ) {
    const gqlFilms = filmPageResponse?.result?.data?.films?.edges
    let movieList = gqlFilms.map(gqlFilm => {
      const { fields, frontmatter } = gqlFilm?.node
      const { themes: gqlThemes, categories: gqlCategories, slug } = fields
      const formattedCategories = gqlCategories
        ? gqlCategories.map(gqlCategory => {
            return gqlCategory?.frontmatter?.title
          })
        : []
      const formattedThemes = gqlThemes
        ? gqlThemes.map(gqlTheme => {
            const { fields, frontmatter } = gqlTheme
            return {
              slug: fields?.slug,
              id: frontmatter.id,
              title: frontmatter.title.trim(),
            }
          })
        : []
      const movieObject: Movie = {
        url: `https://theprojector.sg${slug}`,
        categories: formattedCategories,
        themes: formattedThemes,
        veeziFilmId: frontmatter.veeziFilmId,
        title: frontmatter.title,
        description: frontmatter.blurbHtml,
        rating: frontmatter.rating,
        subtitles: frontmatter.subtitles ? frontmatter.subtitles : [],
        releasingSchedules: frontmatter.releasingSchedules,
        eventTypes: frontmatter.eventTypes,
        order: frontmatter.order,
        coverImage: frontmatter.coverImage.childImageSharp?.fluid?.src,
      }
      return movieObject
    })

    movieList.filter(movie => {
      return movie?.veeziFilmId
    })

    const movieListPromise = movieList.map(async movie => {
      if (!movie || !movie?.veeziFilmId) return movie
      movie.movieDetail = await fetchMovieDetails(movie.veeziFilmId)
      return movie
    })
    return await Promise.all(movieListPromise)
  } else {
    return []
  }
}

export const fetchShowtimes = async (): Promise<Screening[]> => {
  return fetchShowtimesApi()
}

module.exports = { fetchCinemas, fetchMovies, fetchShowtimes }
