const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Free models to use with OpenRouter (in priority order)
const FREE_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'qwen/qwen3-235b-a22b:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
] as const

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterChatRequest {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
}

export interface OpenRouterChatResponse {
  id: string
  model: string
  choices: {
    index: number
    message: OpenRouterMessage
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  error?: {
    code: number
    message: string
  }
}

/**
 * Makes a request to OpenRouter with automatic fallback to alternative models
 * @param messages - The chat messages to send
 * @param temperature - The temperature parameter for generation
 * @param maxTokens - Maximum tokens to generate
 * @returns The response content or null if all models fail
 */
async function makeOpenRouterRequest(
  messages: OpenRouterMessage[],
  temperature: number = 0.3,
  maxTokens: number = 50,
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set, skipping OpenRouter request')
    return null
  }

  // Try each model in order until one succeeds
  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = FREE_MODELS[i]
    try {
      const requestBody: OpenRouterChatRequest = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/cinema-felem/scraper',
          'X-Title': 'Cinema Scraper',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`Model ${model} failed with status ${response.status}: ${errorText}`)
        continue // Try next model
      }

      const result: OpenRouterChatResponse = await response.json()

      if (result.error) {
        console.warn(`Model ${model} returned error: ${result.error.message}`)
        continue // Try next model
      }

      if (!result.choices || result.choices.length === 0) {
        console.warn(`Model ${model} returned no choices`)
        continue // Try next model
      }

      const content = result.choices[0].message.content.trim()
      console.log(`✓ Successfully used model: ${model}`)
      return content
    } catch (error) {
      console.warn(`Model ${model} failed with error:`, error)
      // Continue to next model
    }
  }

  console.error('All OpenRouter models failed')
  return null
}

/**
 * Normalizes and corrects a movie title using OpenRouter's LLM API
 * This is useful when TMDB search fails due to:
 * - Typos or misspellings
 * - Special characters or formatting issues
 * - Abbreviations that need expansion
 * - Foreign language titles that need translation
 *
 * @param rawTitle - The raw movie title from the cinema scraper
 * @returns The corrected/normalized title, or null if correction fails
 */
export async function correctMovieTitleWithOpenRouter(
  rawTitle: string,
): Promise<string | null> {
  if (!rawTitle || rawTitle.trim().length === 0) {
    return null
  }

  try {
    const systemPrompt = `You are a movie title normalization assistant. Your job is to correct and normalize movie titles for searching in The Movie Database (TMDB).

When given a movie title, you should:
1. Fix any obvious typos or misspellings
2. Expand common abbreviations (e.g., "Spiderman" → "Spider-Man")
3. Remove or correct special characters that might interfere with search
4. Keep the title in its original language if it's a well-known international film
5. For sequels, ensure proper formatting (e.g., "Movie 2" → "Movie II" or "Movie Part 2")
6. Remove any extra metadata like year, format (IMAX, 3D), or language tags

Return ONLY the corrected movie title, nothing else. If the title looks correct, return it as-is.`

    const userPrompt = `Correct and normalize this movie title for TMDB search: "${rawTitle}"`

    console.log(`Requesting title correction from OpenRouter for: "${rawTitle}"`)

    const content = await makeOpenRouterRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.3, // Low temperature for more consistent corrections
      50, // Movie titles are short
    )

    if (!content) {
      return null
    }

    // Remove quotes if the LLM wrapped the title in them
    const cleanedTitle = content.replace(/^["']|["']$/g, '')

    console.log(
      `OpenRouter corrected title: "${rawTitle}" → "${cleanedTitle}"`,
    )

    // Only return the corrected title if it's different and non-empty
    if (cleanedTitle && cleanedTitle !== rawTitle) {
      return cleanedTitle
    }

    return null
  } catch (error) {
    console.error(
      `Error correcting title "${rawTitle}" with OpenRouter:`,
      error,
    )
    return null
  }
}

/**
 * Attempts to extract the most likely movie title from a complex string
 * Useful when the scraped data contains extra information like:
 * - "Movie Title (2024) [IMAX]"
 * - "Movie Title - Special Edition"
 * - "Movie Title 电影"
 *
 * @param complexTitle - A title string with potential extra metadata
 * @returns A cleaner title, or null if extraction fails
 */
export async function extractMovieTitleWithOpenRouter(
  complexTitle: string,
): Promise<string | null> {
  if (!complexTitle || complexTitle.trim().length === 0) {
    return null
  }

  try {
    const systemPrompt = `You are a movie title extraction assistant. Extract ONLY the core movie title from strings that may contain extra metadata.

Examples:
- "Spider-Man: No Way Home (2024) [IMAX 3D]" → "Spider-Man: No Way Home"
- "The Batman - Extended Edition" → "The Batman"
- "Frozen II 魔雪奇緣2" → "Frozen II"
- "Top Gun: Maverick [4K]" → "Top Gun: Maverick"

Return ONLY the extracted movie title, nothing else.`

    const userPrompt = `Extract the movie title from: "${complexTitle}"`

    console.log(
      `Requesting title extraction from OpenRouter for: "${complexTitle}"`,
    )

    const content = await makeOpenRouterRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.3,
      50,
    )

    if (!content) {
      return null
    }

    const cleanedTitle = content.replace(/^["']|["']$/g, '')

    console.log(
      `OpenRouter extracted title: "${complexTitle}" → "${cleanedTitle}"`,
    )

    if (cleanedTitle && cleanedTitle !== complexTitle) {
      return cleanedTitle
    }

    return null
  } catch (error) {
    console.error(
      `Error extracting title "${complexTitle}" with OpenRouter:`,
      error,
    )
    return null
  }
}
