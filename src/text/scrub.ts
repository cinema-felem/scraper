export const removeEscapeCharacters = (raw: string): string => {
  let text = structuredClone(raw)
  text = text.replaceAll('\r', ' ')
  text = text.replaceAll('\n', ' ')
  text = text.replaceAll('\t', ' ')
  return text
}

export const removeExcessCharacters = (raw: string): string => {
  let text = structuredClone(raw)
  text = text.replaceAll('*', '')
  text = text.replaceAll('()', ' ')
  text = text.replaceAll(/ +/g, ' ').trim()
  return text
}

export const removeNonASCIICharacters = (raw: string): string => {
  let text = structuredClone(raw)
  text = text.replaceAll(/[^\x00-\x7F]/g, '')
  return text
}

export const asciify = (raw: string): string => {
  raw = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  raw = raw.replace(/[^a-zA-Z0-9 ]/g, '')
  return raw
}

export const cleanString = (
  raw: string,
  specificDetails = (text: string) => {
    return text
  },
) => {
  let text = structuredClone(raw)
  text = removeEscapeCharacters(text)
  text = removeNonASCIICharacters(text)
  text = specificDetails(text)
  text = removeExcessCharacters(text)
  return text
}
