import logger from './logger'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

const defaultHeaders: Record<string, string> = {
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua':
    '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
}

/**
 * A generic HTTP client utility for making fetch requests.
 * It includes default headers, allows overriding them, handles errors,
 * and parses the response as JSON.
 *
 * @template T - The expected type of the JSON response.
 * @param {string} url - The URL to fetch.
 * @param {RequestOptions} [options={}] - Optional request configurations, extending RequestInit.
 * @returns {Promise<T>} A promise that resolves with the JSON response.
 * @throws {Error} Throws an error if the request fails or an unknown error occurs.
 */
async function httpClient<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { headers: customHeaders, ...restOptions } = options

  // Merge default headers with custom headers. Custom headers will override default ones if keys conflict.
  const headers = {
    ...defaultHeaders,
    ...customHeaders,
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text() // Attempt to get more details from the response body
      logger.error(
        `HTTP request to ${url} failed with status ${response.status}: ${errorText}`,
      )
      throw new Error(
        `HTTP request to ${url} failed with status ${response.status}`,
      )
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    // Log the error, including the URL for context
    logger.error(`Error during HTTP request to ${url}: ${error}`)
    if (error instanceof Error) {
      // Re-throw known errors to allow specific handling upstream if needed
      throw error
    }
    // For unknown error types, throw a generic error
    throw new Error(
      `An unknown error occurred during the HTTP request to ${url}.`,
    )
  }
}

export default httpClient
