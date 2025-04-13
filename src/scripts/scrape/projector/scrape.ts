import { PageData } from './gql-types'
import { Film, Screening } from './types'

export const fetchFilmPageData = async (): Promise<PageData> =>
  await fetch('https://theprojector.sg/page-data/films/page-data.json').then(
    response => response.json(),
  )

export const fetchMovieDetails = async (veeziFilmId: string): Promise<Film> =>
  await fetch(`https://api.us.veezi.com/v1/film/${veeziFilmId}`, {
    headers: {
      accept: '*/*',
      'accept-language':
        'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      priority: 'u=1, i',
      'sec-ch-ua':
        '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      veeziaccesstoken: 'sVJR4rtFak-ZQvm87lwoIA2',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'GET',
  }).then(response => response.json())

/**
 * Fetches showtimes from Veezi API using a specific access token
 * @param {string} token - The Veezi access token
 * @returns {Promise<Screening[]>} Array of screening data
 * @throws {Error} When API request fails
 */
const fetchShowtimesWithToken = async (token: string): Promise<Screening[]> => {
  try {
    const response = await fetch('https://api.us.veezi.com/v1/websession/', {
      headers: {
        accept: '*/*',
        'accept-language': 'en-SG,en;q=0.9,zh-SG;q=0.8,zh;q=0.7,en-GB;q=0.6,en-US;q=0.5',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        priority: 'u=1, i',
        'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        veeziaccesstoken: token,
      },
      referrerPolicy: 'same-origin',
      body: null,
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log(`Successfully fetched ${data.length} showtimes with token: ${token}`)
    return data as Screening[]
  } catch (error) {
    console.error(`Error fetching showtimes with token ${token}:`, error)
    return [] // Return empty array instead of throwing to allow processing to continue
  }
}

/**
 * Fetches showtimes using two different Veezi API tokens and combines the results
 * This provides more comprehensive showtime data by accessing different sources
 * @returns {Promise<Screening[]>} Combined array of screenings from both tokens
 */
export const fetchShowtimesApi = async (): Promise<Screening[]> => {
  const token1 = '8xhbsjcv7n4yw5d9kjrmzk9ecg'
  const token2 = 'sVJR4rtFak-ZQvm87lwoIA2'
  
  console.log('Starting to fetch showtimes from both tokens...')
  
  // Fetch showtimes using both tokens in parallel
  const [showtimes1, showtimes2] = await Promise.all([
    fetchShowtimesWithToken(token1),
    fetchShowtimesWithToken(token2)
  ])
  
  // Create a Map to deduplicate by Id for efficient O(1) lookups
  const showtimeMap = new Map<number, Screening>()
  
  // Add showtimes from first token
  showtimes1.forEach(showtime => {
    showtimeMap.set(showtime.Id, showtime)
  })
  
  // Add showtimes from second token (will only add if not already present)
  showtimes2.forEach(showtime => {
    if (!showtimeMap.has(showtime.Id)) {
      showtimeMap.set(showtime.Id, showtime)
    }
  })
  
  // Convert Map back to array
  const combinedShowtimes = Array.from(showtimeMap.values())
  
  console.log(`Combined unique showtimes: ${combinedShowtimes.length}`)
  console.log(`Token 1 showtimes: ${showtimes1.length}`)
  console.log(`Token 2 showtimes: ${showtimes2.length}`)
  
  return combinedShowtimes
}
