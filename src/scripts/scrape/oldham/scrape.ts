import { Browser } from 'playwright'
import { createPlaywrightSession, closePlaywrightSession } from '../../../utils/playwright-config'
import { OldhamMovie, OldhamShowtime } from './types'

const AFA_SITE = 'https://asianfilmarchive.org'
const WHATSON_URL = `${AFA_SITE}/whatson/`

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}

// "May 8, 2026 | 8:00 PM - 10:05 PM" → { date: "2026-05-08", time: "8:00 PM", endTime: "10:05 PM" }
const parseDateTimeStr = (raw: string): { date: string; time: string; endTime: string } => {
  const match = raw.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*\|\s*([\d:]+\s*[APap][Mm])\s*-\s*([\d:]+\s*[APap][Mm])/)
  if (!match) return { date: '', time: '', endTime: '' }
  const month = MONTH_MAP[match[1].toLowerCase()]
  if (!month) return { date: '', time: '', endTime: '' }
  const day = match[2].padStart(2, '0')
  const year = match[3]
  return {
    date: `${year}-${month}-${day}`,
    time: match[4].trim(),
    endTime: match[5].trim(),
  }
}

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

interface RawEvent {
  title: string
  eventUrl: string
  dateTimeStr: string
}

export const scrapeShowtimes = async (): Promise<{ movies: OldhamMovie[]; showtimes: OldhamShowtime[] }> => {
  let browser: Browser | null = null
  try {
    const { browser: b, page } = await createPlaywrightSession()
    browser = b

    await page.goto(WHATSON_URL)
    // Wait for Elementor to render event cards; fall back after 10s if empty
    await page.waitForSelector('h5.elementor-heading-title a[href*="event-calendar"]', { timeout: 10000 }).catch(() => {})

    const rawEvents = await page.evaluate<RawEvent[]>(() => {
      const events: any[] = []
      // AFA uses Elementor; event titles are in h5.elementor-heading-title > a[href*="event-calendar"]
      const titleLinks = Array.from(
        document.querySelectorAll('h5.elementor-heading-title a[href*="event-calendar"]'),
      ) as HTMLAnchorElement[]

      for (const link of titleLinks) {
        const title = link.textContent?.trim() || ''
        const eventUrl = link.href || ''
        if (!title || !eventUrl) continue

        // Walk up to the elementor-widget-wrap container which holds both title and date
        let container: Element | null = link.parentElement
        let dateTimeStr = ''
        for (let i = 0; i < 8; i++) {
          if (!container) break
          container = container.parentElement
          const text = (container as HTMLElement)?.innerText || ''
          const dateMatch = text.match(/\w+ \d{1,2}, \d{4}[^\n]*/)
          if (dateMatch) {
            dateTimeStr = dateMatch[0].trim()
            break
          }
        }
        events.push({ title, eventUrl, dateTimeStr })
      }
      return events
    })

    const moviesMap = new Map<string, OldhamMovie>()
    const showtimes: OldhamShowtime[] = []

    for (const event of rawEvents) {
      const { date, time, endTime } = parseDateTimeStr(event.dateTimeStr)
      if (!date || !time) continue

      const movieId = slugify(event.title)
      if (!moviesMap.has(movieId)) {
        moviesMap.set(movieId, {
          id: movieId,
          title: event.title,
          language: '',
          genre: '',
          duration: 0,
          synopsis: '',
          posterUrl: '',
        })
      }

      showtimes.push({
        movieId,
        movieTitle: event.title,
        date,
        time,
        endTime,
        eventUrl: event.eventUrl,
      })
    }

    return { movies: Array.from(moviesMap.values()), showtimes }
  } catch (err) {
    console.error('Oldham: failed to scrape:', err)
    return { movies: [], showtimes: [] }
  } finally {
    if (browser) await closePlaywrightSession(browser)
  }
}
