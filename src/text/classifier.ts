// movieClassifier.ts
import { TfIdf } from 'natural'
import { asciify, cleanString } from './scrub'
import { removeMovieDetails } from './title'
import { StandardMovie } from '@/types/standard'
import { Movie } from '@prisma/client'

class MovieDuplicateClassifier {
  private tfidf = new TfIdf()
  private documents: string[] = []
  private threshold = 0.85
  private garbageStrings: string[]

  constructor(garbageStrings: string[]) {
    this.garbageStrings = garbageStrings
  }

  private normalizeTitle(title: string): string {
    return cleanString(
      removeMovieDetails({
        title: asciify(title),
        textToRemove: this.garbageStrings,
      }),
    )
      .toLowerCase()
      .trim()
  }

  private tokenize(title: string): string[] {
    return this.normalizeTitle(title)
      .split(/\s+/)
      .filter(word => word.length > 2)
  }

  public processTitles(records: StandardMovie[]): void {
    this.documents = records.map(record =>
      this.tokenize(record.filmTitle).join(' '),
    )
    this.documents.forEach(doc => this.tfidf.addDocument(doc))
  }

  private getSimilarity(docIndexA: number, docIndexB: number): number {
    const terms = new Set([
      ...this.tokenize(this.documents[docIndexA]),
      ...this.tokenize(this.documents[docIndexB]),
    ])

    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    terms.forEach(term => {
      const tfidfA = this.tfidf.tfidf(term, docIndexA)
      const tfidfB = this.tfidf.tfidf(term, docIndexB)
      dotProduct += tfidfA * tfidfB
      magnitudeA += tfidfA ** 2
      magnitudeB += tfidfB ** 2
    })

    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
  }

  public findDuplicates(
    records: StandardMovie[],
  ): Map<string, StandardMovie[]> {
    this.processTitles(records)
    const groups = new Map<string, StandardMovie[]>()
    const processed = new Set<number>()

    records.forEach((record, index) => {
      if (processed.has(index)) return

      const group: StandardMovie[] = [record]
      processed.add(index)

      records.forEach((otherRecord, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return

        if (this.getSimilarity(index, otherIndex) >= this.threshold) {
          group.push(otherRecord)
          processed.add(otherIndex)
        }
      })

      const baseTitle = this.tokenize(record.filmTitle).sort().join('_')
      groups.set(baseTitle, group)
    })

    return groups
  }
}

export function mergeMovieDuplicates(
  entries: StandardMovie[],
  garbageStrings: string[] = [],
): Partial<Movie>[] {
  const classifier = new MovieDuplicateClassifier(garbageStrings)
  const duplicates = classifier.findDuplicates(entries)
  const result: Partial<Movie>[] = []

  duplicates.forEach((group, _) => {
    if (group.length === 0) return

    // Merge sources from all duplicates
    const sources = group.map(movie => movie.source)

    // Use the most common title variation
    const titleCounts = new Map<string, number>()
    group.forEach(movie => {
      const count = titleCounts.get(movie.filmTitle) || 0
      titleCounts.set(movie.filmTitle, count + 1)
    })
    const [[mainTitle]] = Array.from(titleCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )

    // Create merged movie entry
    const mergedMovie: Partial<Movie> = {
      title: mainTitle,
      language: mergeUniqueValues(group, 'language') ?? 'Unknown',
      format: mergeUniqueValues(group, 'format') ?? '2D',
      titleVariations: Array.from(new Set(group.flatMap(m => m.filmTitle))),
      movieIds: Array.from(new Set(group.flatMap(m => m.id))),
    }

    result.push(mergedMovie)
  })

  return result
}

// Helper function to merge unique values
const mergeUniqueValues = (
  group: StandardMovie[],
  key: keyof StandardMovie,
): string | undefined => {
  const foundValue = group.find(m => {
    const value = m[key]
    if (typeof value === 'string' && value.toLowerCase() !== 'unknown') {
      return true
    } else return false
  })
  return typeof foundValue?.[key] === 'string' ? foundValue[key] : undefined
}

/* Implementation Notes:
1. Install dependencies:
   npm install natural @types/natural

2. Enhanced TF-IDF features:
   - Automatic handling of term significance using natural's TF-IDF
   - Tokenization integrated with existing normalization
   - Cosine similarity calculation optimized for movie titles

3. Key improvements over manual implementation:
   - Built-in IDF calculations
   - Efficient term frequency tracking
   - Support for advanced weighting schemes
   - Better handling of sparse vectors
*/
