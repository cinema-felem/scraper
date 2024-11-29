require('dotenv').config()

const { queryCinema, updateMetadata } = require('../storage/cinema')

const gmapAPIKey = process.env.GMAP_API_KEY

const textIdSKU = 'places.id,places.name'
const detailsIdSKU = 'id,name' // for debugging
const acceptedLanguage =
  'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5'

const detailsLocationSKU =
  'addressComponents,adrFormatAddress,formattedAddress,location,plusCode,shortFormattedAddress,types,viewport'

const lookupPlace = async textString => {
  const placeInfo = await lookupPlaceText(textString)
  if (!placeInfo) return null
  const { id } = placeInfo
  const placeDetails = await lookupPlaceDetails(id)
  return placeDetails
}

const lookupPlaceText = async textString => {
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

  if (locationJSON?.places?.length < 1) return null
  console.log(locationJSON)
  return locationJSON.places[0]
}

const lookupPlaceDetails = async id => {
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

  const locationJSON = await locationRequest.json()

  const {
    // types,
    formattedAddress,
    addressComponents,
    // plusCode,
    location,
    // viewport,
    // adrFormatAddress,
    shortFormattedAddress,
  } = locationJSON
  // const { low, high } = viewport;
  // const { latitude, longitude } = location;
  // const { globalCode, compoundCode } = plusCode;
  // const { countryName } = addressComponents[0];
  // const { postalCode } = addressComponents[1];
  // const { latitude: lowLat, longitude: lowLng } = low;
  // const { latitude: highLat, longitude: highLng } = high;
  return {
    id,
    address: formattedAddress,
    shortFormattedAddress,
    location,
    addressComponents,
  }
  // return locationJSON;
}
const lookupLocation = async ({ cinemaName, locationText }) => {
  const text = locationText ? locationText : cinemaName
  const placeInfo = await lookupPlaceText(text)

  const place_id = placeInfo.id
  const placeDetails = await lookupPlaceDetails(place_id)
  const { shortFormattedAddress, formattedAddress, location } = placeDetails
  const locationInfo = {
    address: shortFormattedAddress,
    full_address: formattedAddress,
    location: location,
    external_ids: { places: place_id },
  }

  return locationInfo
}

const contextualiseCinema = async cinemas => {
  const returnValue = cinemas.flatMap(async cinema => {
    const { name, location, id } = cinema

    const queriedCinema = await queryCinema(id)
    if (!queriedCinema) return []
    if (queriedCinema?.location) return queriedCinema
    const metadata = await lookupLocation({
      cinemaName: name,
      locationText: location,
    })
    await updateMetadata(id, metadata)

    return await queryCinema(id)
  })

  return await Promise.all(returnValue)
}

module.exports = {
  lookupPlace,
  lookupPlaceText,
  contextualiseCinema,
}
