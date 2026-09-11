import { describe, test, expect } from 'vite-plus/test'
import { sentencesToTranscript } from '@/utils/lesson/transcript'

const sentenceRow = (over) => ({
  ordinal: 0,
  start_seconds: 0,
  end_seconds: 1,
  text: 'hi',
  words: [],
  paragraph_gap: 0,
  translation: null,
  readings: null,
  chapter_title: null,
  ...over
})

describe('sentencesToTranscript', () => {
  test('text is the word tokens joined, not the sentence texts', () => {
    const rows = [
      sentenceRow({
        text: 'Hello there',
        words: [
          { word: 'Hello ', start: 0, end: 0.5 },
          { word: 'there', start: 0.5, end: 1 }
        ]
      })
    ]

    const transcript = sentencesToTranscript(rows)

    expect(transcript.text).toBe('Hello there')
  })

  test('merges readings into words by index', () => {
    const rows = [
      sentenceRow({
        words: [
          { word: '猫', start: 0, end: 0.3 },
          { word: 'が', start: 0.3, end: 0.6 }
        ],
        readings: ['ねこ', '']
      })
    ]

    const transcript = sentencesToTranscript(rows)

    expect(transcript.words.map((w) => w.reading)).toEqual(['ねこ', undefined])
  })

  test('builds chapters only from rows carrying a chapter_title', () => {
    const rows = [
      sentenceRow({ ordinal: 0, start_seconds: 0, chapter_title: 'Chapter One' }),
      sentenceRow({ ordinal: 1, start_seconds: 5, chapter_title: null }),
      sentenceRow({ ordinal: 2, start_seconds: 10, chapter_title: 'Chapter Two' })
    ]

    const transcript = sentencesToTranscript(rows)

    expect(transcript.chapters).toEqual([
      { title: 'Chapter One', start: 0 },
      { title: 'Chapter Two', start: 10 }
    ])
  })

  test('empty input yields an empty transcript', () => {
    const transcript = sentencesToTranscript([])

    expect(transcript).toEqual({ text: '', segments: [], words: [], chapters: [] })
  })
})
