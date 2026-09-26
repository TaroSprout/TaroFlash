import { describe, test, expect } from 'vite-plus/test'
import { stitchMeasuredWords } from '@/utils/reader/measure'

function word(index, paragraph_index, top, bottom) {
  return { index, paragraph_index, top, bottom }
}

function paragraph(paragraph_index, height, band_height, words) {
  return { paragraph_index, height, band_height, words }
}

describe('stitchMeasuredWords', () => {
  test('returns no words for an empty book', () => {
    expect(stitchMeasuredWords({ paragraphs: [], gap: 10 })).toEqual([])
  })

  test('offsets a single paragraph by nothing — its own words keep their local coordinates', () => {
    const book = {
      paragraphs: [paragraph(0, 100, 0, [word(0, 0, 0, 18), word(1, 0, 20, 38)])],
      gap: 10
    }

    expect(stitchMeasuredWords(book)).toEqual([word(0, 0, 0, 18), word(1, 0, 20, 38)])
  })

  test('stacks a second paragraph beneath the first, offset by the first height plus the gap', () => {
    const book = {
      paragraphs: [
        paragraph(0, 100, 0, [word(0, 0, 0, 18)]),
        paragraph(1, 50, 0, [word(1, 1, 0, 18)])
      ],
      gap: 10
    }

    expect(stitchMeasuredWords(book)).toEqual([word(0, 0, 0, 18), word(1, 1, 110, 128)])
  })

  test('a zero gap stacks paragraphs directly against each other', () => {
    const book = {
      paragraphs: [
        paragraph(0, 100, 0, [word(0, 0, 0, 18)]),
        paragraph(1, 50, 0, [word(1, 1, 0, 18)])
      ],
      gap: 0
    }

    expect(stitchMeasuredWords(book)[1]).toEqual(word(1, 1, 100, 118))
  })

  test('accumulates the offset across three or more paragraphs', () => {
    const book = {
      paragraphs: [
        paragraph(0, 100, 0, [word(0, 0, 0, 18)]),
        paragraph(1, 50, 0, [word(1, 1, 0, 18)]),
        paragraph(2, 20, 0, [word(2, 2, 0, 18)])
      ],
      gap: 5
    }

    const words = stitchMeasuredWords(book)
    expect(words[2]).toEqual(word(2, 2, 160, 178))
  })

  test('a paragraph with no words contributes only its height to the running offset', () => {
    const book = {
      paragraphs: [paragraph(0, 100, 0, []), paragraph(1, 50, 0, [word(1, 1, 0, 18)])],
      gap: 10
    }

    expect(stitchMeasuredWords(book)).toEqual([word(1, 1, 110, 128)])
  })

  test('preserves each word index and paragraph_index unchanged', () => {
    const book = {
      paragraphs: [paragraph(3, 100, 0, [word(42, 3, 0, 18)])],
      gap: 0
    }

    const [stitched] = stitchMeasuredWords(book)
    expect(stitched.index).toBe(42)
    expect(stitched.paragraph_index).toBe(3)
  })
})
