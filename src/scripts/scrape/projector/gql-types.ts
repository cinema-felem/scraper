type Rating = 'PG13' | 'M18' | 'NC16' | 'R21' | 'PG'

interface Fluid {
  base64: string
  aspectRatio: number
  src: string
  srcSet: string
  sizes: string
}

interface CoverImage {
  childImageSharp: {
    fluid: Fluid
  }
}

interface Theme {
  fields?: SimpleSlug
  frontmatter: SimpleFrontMatter
}

interface SimpleSlug {
  slug: string
}

interface SimpleFrontMatter {
  id: string
  title: string
}

interface Category {
  frontmatter: {
    id: string
    title: string
  }
}

interface FilmFrontmatter {
  veeziFilmId: string
  order: number
  eventTypes: string[]
  title: string
  coverImage: CoverImage
  blurbHtml: string
  rating: Rating
  releasingSchedules?: string[]
  callToAction?: string
  terms?: string[] | null
  startDate?: string
  endDate?: string
  bookingURL?: string | null
  platforms: string[]
  vodURL?: string | null
  vodCallToAction?: string | null
  subtitles?: string[] | null
  screenings?: null
}

interface FilmFields {
  slug: string
  themes?: Theme[] | null
  categories?: Category[]
}

interface CategoryNode {
  fields: SimpleSlug
  frontmatter: SimpleFrontMatter
}

interface ComplexFrontMatter {
  id: string
  title: string
  startDate: string
  endDate: string
}

interface Screen {
  veeziScreenId: number
}

interface Venue {
  frontmatter: {
    title: string
    screens: Screen[] | null
    accessibility: string[] | null
  }
}

interface Location {
  frontmatter: {
    title: string
    veeziToken: string
  }
  fields: {
    venues: Venue[]
  }
}

interface VenueFrontmatter {
  id: string
  title: string
  screens: Screen[] | null
  accessibility: string[] | null
}

interface VenueNode {
  fields: SimpleSlug
  frontmatter: VenueFrontmatter
}

interface ResultData {
  films: {
    edges: {
      node: {
        fields: FilmFields
        frontmatter: FilmFrontmatter
      }
    }[]
  }
  themes: {
    edges: {
      node: {
        fields: SimpleSlug
        frontmatter: ComplexFrontMatter
      }
    }[]
  }
  categories: {
    edges: { node: CategoryNode }[]
  }
  locations: { edges: { node: Location }[] }
  venues: { edges: { node: VenueNode }[] }
  searchIndex: { index: SearchIndexIndex }
}

interface SearchIndexDocument {
  id: string
  title: string
  slug: string
  themes: string
  eventTypes: string[]
  actors: string
  director: string
  performers: string
}

interface SearchIndexDocInfo {
  title: number
  themes: number
  actors: number
  director: number
}

interface SearchIndexDocumentStore {
  docs: {
    [id: string]: SearchIndexDocument
  }
  docInfo: {
    [id: string]: SearchIndexDocInfo
  }
  length: number
  save: boolean
}

interface SearchIndexIndex {
  version: string
  fields: string[]
  ref: string
  documentStore: SearchIndexDocumentStore
  index: {
    [field: string]: {
      root: object
    }
  }
  pipeline: string[]
}

export interface PageData {
  componentChunkName: string
  path: string
  result: {
    data: ResultData
    pageContext: {}
  }
  staticQueryHashes: string[]
}
