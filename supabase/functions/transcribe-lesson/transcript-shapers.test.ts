// Tests for the pure transcript-shaping helpers extracted out of worker.ts —
// no network, DB, or storage calls, so these run directly against plain data.

import { assertEquals } from '@std/assert'
import { normalizeTranscript, appendChunk, assignWordsToSegments } from './transcript-shapers.ts'
import type { Segment, Word } from '../_shared/transcription/transcript.ts'

Deno.test('normalizeTranscript: coerces {} into the full shape', () => {
  const t = normalizeTranscript({})
  assertEquals(t.text, '')
  assertEquals(t.segments, [])
  assertEquals(t.words, [])
  assertEquals(t.chapters, undefined)
})

Deno.test('normalizeTranscript: coerces null into the full shape', () => {
  const t = normalizeTranscript(null)
  assertEquals(t.text, '')
  assertEquals(t.segments, [])
  assertEquals(t.words, [])
  assertEquals(t.chapters, undefined)
})

Deno.test('normalizeTranscript: coerces undefined into the full shape', () => {
  const t = normalizeTranscript(undefined)
  assertEquals(t.text, '')
  assertEquals(t.segments, [])
  assertEquals(t.words, [])
  assertEquals(t.chapters, undefined)
})

Deno.test('normalizeTranscript: preserves provided fields', () => {
  const segments: Segment[] = [{ start: 0, end: 1, text: 'hi' }]
  const words: Word[] = [{ word: 'hi', start: 0, end: 1 }]
  const chapters = [{ title: 'Intro', start: 0 }]
  const t = normalizeTranscript({ text: 'hi', segments, words, chapters })
  assertEquals(t.text, 'hi')
  assertEquals(t.segments, segments)
  assertEquals(t.words, words)
  assertEquals(t.chapters, chapters)
})

Deno.test('normalizeTranscript: leaves chapters undefined rather than defaulting it', () => {
  const t = normalizeTranscript({ text: 'hi', segments: [], words: [] })
  assertEquals(t.chapters, undefined)
})

Deno.test('appendChunk: an empty accumulator (boundary -Infinity) keeps everything', () => {
  const acc = normalizeTranscript(null)
  const incoming = {
    segments: [{ start: 0, end: 1, text: 'hi' }],
    words: [{ word: 'hi', start: 0, end: 1 }]
  }
  const result = appendChunk(acc, incoming)
  assertEquals(result.segments, incoming.segments)
  assertEquals(result.words, incoming.words)
  assertEquals(result.text, 'hi')
})

Deno.test('appendChunk: drops incoming segments/words before the boundary', () => {
  const acc: ReturnType<typeof normalizeTranscript> = {
    text: 'hi',
    segments: [{ start: 0, end: 2, text: 'hi' }],
    words: [{ word: 'hi', start: 0, end: 2 }]
  }
  const incoming = {
    segments: [
      { start: 1, end: 2, text: 'overlap' }, // before boundary (2), dropped
      { start: 2, end: 3, text: 'new' } // at boundary, kept
    ],
    words: [
      { word: 'overlap', start: 1, end: 2 }, // before boundary, dropped
      { word: 'new', start: 2, end: 3 } // at boundary, kept
    ]
  }
  const result = appendChunk(acc, incoming)
  assertEquals(result.segments, [
    { start: 0, end: 2, text: 'hi' },
    { start: 2, end: 3, text: 'new' }
  ])
  assertEquals(result.words, [
    { word: 'hi', start: 0, end: 2 },
    { word: 'new', start: 2, end: 3 }
  ])
})

Deno.test('appendChunk: rebuilds text from kept word tokens, not segment texts', () => {
  const acc: ReturnType<typeof normalizeTranscript> = {
    text: 'Hello ',
    segments: [{ start: 0, end: 1, text: 'Hello there' }],
    words: [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: ' there', start: 0.5, end: 1 }
    ]
  }
  const incoming = {
    segments: [{ start: 1, end: 2, text: 'world' }],
    words: [{ word: ' world', start: 1, end: 2 }]
  }
  const result = appendChunk(acc, incoming)
  // Concatenation of KEPT word tokens joined with '', not segment text.
  assertEquals(result.text, 'Hello there world')
})

Deno.test('appendChunk: cuts segments and words on the same boundary so they stay aligned', () => {
  const acc: ReturnType<typeof normalizeTranscript> = {
    text: 'a',
    segments: [{ start: 0, end: 5, text: 'a' }],
    words: [{ word: 'a', start: 0, end: 5 }]
  }
  // Incoming has a segment kept but its corresponding word dropped by an
  // inconsistent per-field boundary would misalign — verify both use `5`.
  const incoming = {
    segments: [
      { start: 3, end: 4, text: 'dropped-seg' }, // before boundary
      { start: 5, end: 6, text: 'kept-seg' } // at boundary
    ],
    words: [
      { word: 'dropped-word', start: 3, end: 4 }, // before boundary
      { word: 'kept-word', start: 5, end: 6 } // at boundary
    ]
  }
  const result = appendChunk(acc, incoming)
  assertEquals(
    result.segments.map((s) => s.text),
    ['a', 'kept-seg']
  )
  assertEquals(
    result.words.map((w) => w.word),
    ['a', 'kept-word']
  )
})

Deno.test("appendChunk: spreads the accumulator's other fields through", () => {
  const acc: ReturnType<typeof normalizeTranscript> = {
    text: 'a',
    segments: [],
    words: [],
    chapters: [{ title: 'Ch1', start: 0 }]
  }
  const result = appendChunk(acc, { segments: [], words: [] })
  assertEquals(result.chapters, [{ title: 'Ch1', start: 0 }])
})

Deno.test('assignWordsToSegments: assigns a word to the segment whose span contains its start', () => {
  const segments: Segment[] = [
    { start: 0, end: 1, text: 'a' },
    { start: 1, end: 2, text: 'b' },
    { start: 2, end: 3, text: 'c' }
  ]
  const words: Word[] = [
    { word: 'a1', start: 0, end: 0.5 },
    { word: 'b1', start: 1.2, end: 1.4 },
    { word: 'c1', start: 2.5, end: 2.9 }
  ]
  const groups = assignWordsToSegments(words, segments, 0, segments.length)
  assertEquals(groups, [[0], [1], [2]])
})

Deno.test('assignWordsToSegments: the first segment also claims words before it', () => {
  const segments: Segment[] = [
    { start: 5, end: 10, text: 'a' },
    { start: 10, end: 15, text: 'b' }
  ]
  const words: Word[] = [{ word: 'early', start: 0, end: 1 }]
  const groups = assignWordsToSegments(words, segments, 0, segments.length)
  assertEquals(groups[0], [0])
  assertEquals(groups[1], [])
})

Deno.test('assignWordsToSegments: the last segment claims words after it', () => {
  const segments: Segment[] = [
    { start: 0, end: 5, text: 'a' },
    { start: 5, end: 10, text: 'b' }
  ]
  const words: Word[] = [{ word: 'late', start: 100, end: 101 }]
  const groups = assignWordsToSegments(words, segments, 0, segments.length)
  assertEquals(groups[0], [])
  assertEquals(groups[1], [0])
})

Deno.test('assignWordsToSegments: respects the [from, to) window', () => {
  const segments: Segment[] = [
    { start: 0, end: 1, text: 'a' },
    { start: 1, end: 2, text: 'b' },
    { start: 2, end: 3, text: 'c' }
  ]
  const words: Word[] = [
    { word: 'a1', start: 0.1, end: 0.2 },
    { word: 'b1', start: 1.1, end: 1.2 },
    { word: 'c1', start: 2.1, end: 2.2 }
  ]
  // Only ask for segment index 1 — one group back, for segment 'b'.
  const groups = assignWordsToSegments(words, segments, 1, 2)
  assertEquals(groups.length, 1)
  assertEquals(groups[0], [1])
})
