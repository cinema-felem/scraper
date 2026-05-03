import { chromium, Browser, BrowserContext, Page } from 'playwright'

export interface PlaywrightSession {
  browser: Browser
  context: BrowserContext
  page: Page
}

export const createPlaywrightSession = async (): Promise<PlaywrightSession> => {
  const browser = await chromium.launch({
    headless: process.env.CI === 'true',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  const context = await browser.newContext()
  const page = await context.newPage()
  return { browser, context, page }
}

export const closePlaywrightSession = async (browser: Browser): Promise<void> => {
  try {
    await browser.close()
  } catch (err) {
    console.error('Error closing Playwright browser:', err)
  }
}
