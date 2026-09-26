import { describe, test, expect } from 'vite-plus/test'
import { pageSlices } from '@/utils/reader/slices'

function paragraph(index, translation, words) {
  return { index, sentence: '', translation, start: 0, end: 0, words }
}

function word(index, display = `w${index}`) {
  return { display, start: index, index }
}

describe('pageSlices', () => {
  test('filters words to the inclusive word range', () => {
    const paragraphs = [paragraph(0, undefined, [word(0), word(1), word(2), word(3)])]

    const result = pageSlices(paragraphs, 1, 2)

    expect(result).toEqual([
      { paragraph_index: 0, translation: undefined, words: [word(1), word(2)] }
    ])
  })

  test('groups slices per paragraph in reading order', () => {
    const paragraphs = [
      paragraph(0, 'first', [word(0), word(1)]),
      paragraph(1, 'second', [word(2), word(3)])
    ]

    const result = pageSlices(paragraphs, 0, 3)

    expect(result.map((s) => s.paragraph_index)).toEqual([0, 1])
    expect(result[0].translation).toBe('first')
    expect(result[1].translation).toBe('second')
  })

  test('drops a paragraph with no word in range', () => {
    const paragraphs = [paragraph(0, undefined, [word(0)]), paragraph(1, undefined, [word(5)])]

    const result = pageSlices(paragraphs, 0, 0)

    expect(result).toHaveLength(1)
    expect(result[0].paragraph_index).toBe(0)
  })

  test('carries the paragraph translation through to the slice', () => {
    const paragraphs = [paragraph(0, 'la traduction', [word(0)])]

    const result = pageSlices(paragraphs, 0, 0)

    expect(result[0].translation).toBe('la traduction')
  })
})
