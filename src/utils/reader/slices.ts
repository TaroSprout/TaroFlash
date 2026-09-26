import type { DisplayWord, SentenceWords } from '@/utils/transcript'

// A paragraph's words that fall on one page — the unit a rendered page lays out.
// A paragraph split across a page boundary yields one slice per page it touches,
// each carrying the parent paragraph's index and translation.
export type PageSlice = {
  paragraph_index: number
  translation?: string
  words: DisplayWord[]
}

/**
 * Cut the paragraphs down to the words on one page — those whose global index
 * falls in `[word_start, word_end]` — grouped back into per-paragraph slices in
 * reading order. A paragraph with no word on the page is dropped.
 *
 * @param paragraphs - the shaped paragraphs, words carrying their global index.
 * @param word_start - first word index on the page (inclusive).
 * @param word_end - last word index on the page (inclusive).
 */
export function pageSlices(
  paragraphs: SentenceWords[],
  word_start: number,
  word_end: number
): PageSlice[] {
  const slices: PageSlice[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.words.filter((w) => w.index >= word_start && w.index <= word_end)
    if (words.length === 0) continue

    slices.push({
      paragraph_index: paragraph.index,
      translation: paragraph.translation,
      words
    })
  }

  return slices
}
