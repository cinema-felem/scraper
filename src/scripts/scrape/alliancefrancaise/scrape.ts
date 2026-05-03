import { Browser } from 'playwright'
import { createPlaywrightSession, closePlaywrightSession } from '../../../utils/playwright-config'
import { AFMovie, AFShowtime } from './types'

const AF_EVENTS_URL = 'https://alliancefrancaise.org.sg/event'

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

// "Saturday 09 May 03:00 PM" → { date: "2026-05-09", time: "03:00 PM" }
const parseDateTimeStr = (raw: string): { date: string; time: string } => {
  const match = raw.match(/\w+\s+(\d{1,2})\s+(\w+)\s+([\d:]+\s*[APap][Mm])/)
  if (!match) return { date: '', time: '' }
  const month = MONTH_MAP[match[2].toLowerCase().slice(0, 3)]
  if (!month) return { date: '', time: '' }
  const day = match[1].padStart(2, '0')

  const now = new Date()
  let year = now.getFullYear()
  if (parseInt(month) < now.getMonth() - 1) year++

  return {
    date: `${year}-${month}-${day}`,
    time: match[3].trim(),
  }
}

// Extract date from event URL slug: "…-2026-05-09-5363…" → "2026-05-09"
const dateFromSlug = (url: string): string => {
  const match = url.match(/(\d{4}-\d{2}-\d{2})-\d+/)
  return match ? match[1] : ''
}

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

interface RawFilmCard {
  title: string
  category: string
  eventUrl: string
}

export const scrapeShowtimes = async (): Promise<{ movies: AFMovie[]; showtimes: AFShowtime[] }> => {
  let browser: Browser | null = null
  try {
    const { browser: b, page } = await createPlaywrightSession()
    browser = b

    await page.goto(AF_EVENTS_URL)
    await page.waitForTimeout(4000)

    // Get all film event cards
    const filmCards = await page.evaluate<RawFilmCard[]>(() => {
      const cards: any[] = []
      document.querySelectorAll('.card.bg-white').forEach(card => {
        const titleEl = card.querySelector('h4, h3, .card-title')
        const title = titleEl?.textContent?.trim() || ''
        const categoryEl = card.querySelector('.text-muted, small, [class*="category"]')
        const category = categoryEl?.textContent?.trim() || ''
        const linkEl = card.querySelector('a')
        const eventUrl = (linkEl as HTMLAnchorElement)?.href || ''
        if (title && eventUrl && category === 'Films') {
          cards.push({ title, category, eventUrl })
        }
      })
      return cards
    })

    const moviesMap = new Map<string, AFMovie>()
    const showtimes: AFShowtime[] = []

    for (const card of filmCards) {
      try {
        await page.goto(card.eventUrl)
        await page.waitForTimeout(2000)

        const bodyText = await page.evaluate<string>(() => document.body.innerText.slice(0, 1000))

        // Extract time: "Saturday 09 May 03:00 PM"
        const timeMatch = bodyText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}\s+\w+\s+\d{1,2}:\d{2}\s*(?:AM|PM)/i)
        const dateTimeStr = timeMatch ? timeMatch[0] : ''
        const { date, time } = parseDateTimeStr(dateTimeStr)

        // Fall back to slug date if page parsing fails
        const finalDate = date || dateFromSlug(card.eventUrl)
        if (!finalDate) continue

        const movieId = slugify(card.title)
        if (!moviesMap.has(movieId)) {
          moviesMap.set(movieId, {
            id: movieId,
            title: card.title.replace(/\s*\|\s*FREE FOR MEMBERS\s*$/i, '').trim(),
            language: 'French',
            genre: 'Film',
            duration: 0,
            synopsis: '',
            posterUrl: '',
          })
        }

        showtimes.push({
          movieId,
          movieTitle: card.title,
          date: finalDate,
          time: time || '08:00 PM',
          endTime: '',
          eventUrl: card.eventUrl,
        })
      } catch (err) {
        console.error(`AF: error scraping ${card.eventUrl}:`, err)
      }
    }

    return { movies: Array.from(moviesMap.values()), showtimes }
  } catch (err) {
    console.error('Alliance Française: failed to scrape:', err)
    return { movies: [], showtimes: [] }
  } finally {
    if (browser) await closePlaywrightSession(browser)
  }
}
