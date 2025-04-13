interface CarnivalMovieDetails {
  code: string
  name: string
  censor: string
  language: string
  duration: number
  genre: string
  description: string
  openingDate: string
  imageURL: string
  actor: string
  director: string
  YouTubeURL: string
}

const CARNIVAL_TOKEN =
  'QnQ2V3lBdWNYMXdWYkt6a1RISzdxeEFnT1NVaU9LVDUrbzlYZ1QzcmxwWT18aHR0cHM6Ly9jYXJuaXZhbGNpbmVtYXMuc2cvIy9Nb3ZpZXN8NjM4MjcwMDc4NzAzNDYwMDAwfHJ6OEx1T3RGQlhwaGo5V1FmdkZo'

const headers = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua':
    '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  token: CARNIVAL_TOKEN,
}

export const fetchMovies = async (): Promise<CarnivalMovieDetails[]> => {
  const response = await fetch(
    'https://service.carnivalcinemas.sg/api/QuickSearch/GetAllMovieDetail?locationName=Mumbai',
    {
      headers,
      referrer: 'https://carnivalcinemas.sg/',
      referrerPolicy: 'strict-origin-when-cross-origin',
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    },
  )
  const data = await response.json()
  console.log(data)
  return data
}

export const fetchShowtimes = async (
  movieCode: string,
  date: string,
): Promise<any> => {
  const response = await fetch(
    `https://service.carnivalcinemas.sg/api/QuickSearch/GetCinemaAndShowTimeByMovie?location=Mumbai&date=${date}&movieCode=${encodeURIComponent(movieCode)}`,
    {
      headers,
      referrer: 'https://carnivalcinemas.sg/',
      referrerPolicy: 'strict-origin-when-cross-origin',
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    },
  )
  return await response.json()
}

export const fetchCinemas = async (): Promise<any[]> => {
  // TODO: Implement cinema fetching
  return []
}
