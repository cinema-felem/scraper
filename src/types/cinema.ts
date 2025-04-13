/**
 * Cinema data types for the cinema scraper project
 */

export interface CinemaLocation {
  latitude: number
  longitude: number
}

export interface CinemaChainSpecific {
  url?: string
  address?: string
  nearestMRTStation?: string
  gMapsLink?: string
  [key: string]: any
}

/**
 * Cinema source information aligned with StandardCinema source
 */
export interface CinemaSource {
  chain: string
  id: string
  chainSpecific: CinemaChainSpecific
  details?: unknown // Added for compatibility with StandardCinema
}

export interface CinemaMetadata {
  address: string
  full_address?: string
  location: CinemaLocation
  external_ids: any
  searchableName: string
}

/**
 * Cinema interface aligned with StandardCinema type
 */
export interface Cinema {
  id: string
  name: string
  location?: string
  fullAddress?: string
  address?: string
  searchableName: string // Required in StandardCinema
  source: CinemaSource
  metadata?: CinemaMetadata
  externalIds?: any
  createdAt?: Date
  updatedAt?: Date
}
