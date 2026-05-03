import { CapitolMovie, CapitolShowtime } from './types'

const SISTIC_API = 'https://cms.sistic.com.sg/sistic/docroot/api'
const SISTIC_BASE = 'https://www.sistic.com.sg/events'

const SISTIC_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.sistic.com.sg/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
}

interface SisticEventSummary {
  id: string
  title: string
  alias: string
  start_date: string
  end_date: string
  primary_genre: string
  venue_name: string
  min_price: string
  max_price: string
  thumb_image: string
}

interface SisticEventDetail {
  title: string
  synopsis: string
  start_date: string
  end_date: string
  venue_name: { name: string }
  description: string
}

// "Sun, 03 May 2026" → "2026-05-03"
const parseDate = (raw: string): string => {
  const MONTHS: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  }
  const match = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (!match) return ''
  const month = MONTHS[match[2].slice(0, 3)]
  if (!month) return ''
  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`
}

export const fetchCapitolFilms = async (): Promise<{ movies: CapitolMovie[]; showtimes: CapitolShowtime[] }> => {
  const listRes = await fetch(
    `${SISTIC_API}/events?first=0&limit=30&sort_type=date&sort_order=ASC&index=global&client=1&venue=Capitol+Theatre`,
    { headers: SISTIC_HEADERS },
  )
  if (!listRes.ok) throw new Error(`SISTIC listing returned ${listRes.status}`)
  const listData = await listRes.json() as { data: SisticEventSummary[] }

  const filmEvents = (listData.data || []).filter(
    e => e.primary_genre === 'Film/Movies',
  )

  const movies: CapitolMovie[] = []
  const showtimes: CapitolShowtime[] = []

  for (const event of filmEvents) {
    const detailRes = await fetch(
      `${SISTIC_API}/event-detail?client=1&code=${event.alias}`,
      { headers: SISTIC_HEADERS },
    )
    const detail = detailRes.ok ? (await detailRes.json() as SisticEventDetail) : null

    const rawSynopsis = typeof detail?.synopsis === 'string' ? detail.synopsis : ''
    const synopsis = rawSynopsis.replace(/<[^>]+>/g, '').trim()
    const startDate = parseDate(event.start_date)
    const endDate = parseDate(event.end_date)

    if (!startDate) continue

    const movieId = `capitol:${event.alias}`
    movies.push({
      id: event.alias,
      title: event.title.trim(),
      language: 'English',
      genre: 'Classic Film',
      duration: 0,
      synopsis,
      posterUrl: event.thumb_image
        ? `https://cms.sistic.com.sg/sistic/docroot${event.thumb_image}`
        : '',
      sisticCode: event.alias,
      startDate,
      endDate,
    })

    showtimes.push({
      movieId: event.alias,
      movieTitle: event.title.trim(),
      date: startDate,
      sisticCode: event.alias,
      sisticUrl: `${SISTIC_BASE}/${event.alias}`,
    })
  }

  return { movies, showtimes }
}
