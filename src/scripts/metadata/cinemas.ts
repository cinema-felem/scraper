import 'dotenv/config'
import { queryCinema, updateMetadata, lookupCinemas } from '../storage/cinema'
import { Cinema } from '@prisma/client'
import {
  CinemaLocation,
  CinemaMetadata as CinemaMetadataType,
} from '../../types/cinema'

const gmapAPIKey = process.env.GMAP_API_KEY

const textIdSKU = 'places.id,places.name'
const detailsLocationSKU =
  'addressComponents,adrFormatAddress,formattedAddress,location,plusCode,shortFormattedAddress,types,viewport'
const acceptedLanguage =
  'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5'

interface PlaceInfo {
  id: string
  name?: string
}

// Using CinemaLocation from types/cinema.ts

interface PlaceDetailsResponse {
  id?: string
  formattedAddress: string
  addressComponents: any[]
  location: {
    latitude: number
    longitude: number
  }
  shortFormattedAddress: string
}

interface PlaceDetails {
  id: string
  address: string
  shortFormattedAddress: string
  location: {
    latitude: number
    longitude: number
  }
  addressComponents: any[]
}

// Using our own CinemaMetadata interface to match the one in cinema/metadata.ts
interface CinemaMetadata {
  address: string
  full_address: string
  location: CinemaLocation
  external_ids: string // Match the type in cinema/metadata.ts
  searchableName: string
}

const lookupPlaceText = async (
  textString: string,
): Promise<PlaceInfo | null> => {
  const requestBody = {
    textQuery: textString,
  }

  const locationRequest = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': gmapAPIKey,
        'X-Goog-FieldMask': textIdSKU,
        'accept-language': acceptedLanguage,
      },
      body: JSON.stringify(requestBody),
      method: 'POST',
    },
  )

  const locationJSON = await locationRequest.json()

  if (!locationJSON?.places?.length) return null
  console.log(locationJSON)
  return locationJSON.places[0]
}

const lookupPlaceDetails = async (id: string): Promise<PlaceDetails> => {
  const locationRequest = await fetch(
    `https://places.googleapis.com/v1/places/${id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': gmapAPIKey,
        'X-Goog-FieldMask': detailsLocationSKU,
        'accept-language': acceptedLanguage,
      },
      method: 'GET',
    },
  )

  const locationJSON: PlaceDetailsResponse = await locationRequest.json()

  const {
    formattedAddress,
    addressComponents,
    location,
    shortFormattedAddress,
  } = locationJSON

  return {
    id,
    address: formattedAddress,
    shortFormattedAddress,
    location,
    addressComponents,
  }
}

const lookupPlace = async (
  textString: string,
): Promise<PlaceDetails | null> => {
  const placeInfo = await lookupPlaceText(textString)
  if (!placeInfo) return null
  const { id } = placeInfo
  const placeDetails = await lookupPlaceDetails(id)
  return placeDetails
}

const lookupLocation = async ({
  cinemaName,
  locationText,
}: {
  cinemaName: string
  locationText?: string
}): Promise<CinemaMetadata> => {
  const text = locationText || cinemaName
  const placeInfo = await lookupPlaceText(text)

  if (!placeInfo) {
    throw new Error(`Could not find location for ${text}`)
  }

  const placeDetails = await lookupPlaceDetails(placeInfo.id)
  const { shortFormattedAddress, address, location } = placeDetails

  return {
    address: shortFormattedAddress,
    full_address: address,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    external_ids: JSON.stringify({ places: placeInfo.id }), // Convert to string
    searchableName: text,
  }
}

export const contextualiseCinema = async (): Promise<Cinema[]> => {
  const cinemas = await lookupCinemas()
  const returnValue = cinemas.map(async (cinema: Cinema) => {
    const { name, fullAddress, id, searchableName } = cinema

    if (fullAddress) return cinema

    console.log(`Looking up ${name}`)

    try {
      const metadata = await lookupLocation({
        cinemaName: name,
        locationText: searchableName,
      })
      await updateMetadata(id, metadata)
      return await queryCinema(id)
    } catch (error) {
      console.error(`Error looking up ${name}:`, error)
      return cinema
    }
  })

  return await Promise.all(returnValue)
}

export { lookupPlace, lookupPlaceText }
