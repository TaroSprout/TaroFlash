import type { MeasuredWord } from './pagination'

export type WordGeometry = {
  index: number
  paragraph_index: number
  top: number
  bottom: number
}

export type ParagraphGeometry = {
  paragraph_index: number
  height: number
  band_height: number
  words: WordGeometry[]
}

export type BookGeometry = {
  paragraphs: ParagraphGeometry[]
  gap: number
}

export function stitchMeasuredWords(book: BookGeometry): MeasuredWord[] {
  const words: MeasuredWord[] = []

  let offset = 0

  book.paragraphs.forEach((paragraph, i) => {
    if (i > 0) offset += book.gap

    for (const word of paragraph.words) {
      words.push({
        index: word.index,
        paragraph_index: word.paragraph_index,
        top: offset + word.top,
        bottom: offset + word.bottom
      })
    }

    offset += paragraph.height
  })

  return words
}

export function bandHeights(book: BookGeometry): Map<number, number> {
  const heights = new Map<number, number>()

  for (const paragraph of book.paragraphs) {
    heights.set(paragraph.paragraph_index, paragraph.band_height)
  }

  return heights
}
