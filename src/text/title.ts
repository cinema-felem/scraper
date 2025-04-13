import { cleanString } from './scrub'

const parentalRating = ['PG13', 'NC16', 'M18', 'R21', 'PG']
const language = ['Tamil', 'Malayalam', 'Malay', '(M)', 'KOR', 'CHN']
const subs = ['English Sub', 'Eng Sub']
const format = ['Atmos', 'IMAX', '2D', '3D', 'Digital']

export const removeMovieDetails = ({
  title,
  textToRemove,
  chainSpecificDetails,
}: {
  title: string
  textToRemove?: string[]
  chainSpecificDetails?: (text: string) => string
}) => {
  let text = structuredClone(title)
  text = cleanString(text)
  text = removeText(text, parentalRating)
  text = removeText(text, subs)
  text = removeText(text, language)
  text = removeText(text, format)
  if (textToRemove) text = removeText(text, textToRemove)
  if (chainSpecificDetails) text = chainSpecificDetails(text)
  text = cleanString(text)
  return text
}

export const removeText = (raw: string, toRemove: string[]): string => {
  for (const text of toRemove) {
    raw = raw.toLowerCase().replaceAll(text.toLowerCase(), '')
  }
  return raw
}
