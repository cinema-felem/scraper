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
 * Attempts to normalize multiple movie titles in a single OpenRouter request
 * Normalization covers typo correction, metadata stripping and formatting fixes
 *
 * @param rawTitles - Array of movie titles that could not be matched on TMDB
 * @returns Record mapping original titles to normalized titles
 */
export async function normalizeMovieTitlesWithOpenRouter(
  rawTitles: string[],
): Promise<Record<string, string>> {
  const uniqueTitles = Array.from(
    new Set(
      rawTitles
        .map(title => title?.trim())
        .filter((title): title is string => Boolean(title && title.length > 0)),
    ),
  )

  if (uniqueTitles.length === 0) {
    return {}
  }

  try {
    const systemPrompt = `You are a movie title normalization assistant helping prepare titles for searching on The Movie Database (TMDB).

For every title provided:
1. Fix typos or misspellings.
2. Expand common abbreviations (e.g., "Spiderman" → "Spider-Man").
3. Remove special characters or metadata that would hurt search (years, formats like IMAX/3D, release notes, language tags, edition details, etc.).
4. Keep well-known international titles in their widely recognised form.
5. Ensure sequels and numbered entries use standard formatting (e.g., "II", "Part 2", etc.).
6. Return the best search-ready title for TMDB.

Respond **only** with valid JSON where each key is exactly the original title provided and each value is the normalized title. Example:
{ "Raw Title" : "Normalized Title" }`

    const formattedTitles = uniqueTitles
      .map((title, index) => `${index + 1}. ${title}`)
      .join('\n')

    const userPrompt = `Normalize the following movie titles for TMDB search.
Return a single JSON object mapping each original title to its normalized title.

Titles:\n${formattedTitles}`

    console.log(
      `Requesting OpenRouter normalization for ${uniqueTitles.length} movie titles`,
    )

    const content = await makeOpenRouterRequest(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.2,
      600,
    )

    if (!content) {
      return {}
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('OpenRouter response did not contain JSON output:', content)
      return {}
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>
    const normalizedMap: Record<string, string> = {}

    for (const [key, value] of Object.entries(parsed)) {
      if (!key || typeof value !== 'string') {
        continue
      }

      normalizedMap[key.trim()] = value.trim()
    }

    return normalizedMap
  } catch (error) {
    console.error('Error normalizing titles with OpenRouter:', error)
    return {}
  }
}
