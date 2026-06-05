import { describe, test, expect } from 'vite-plus/test'
import { groupWordsBySentence, groupSentencesIntoParagraphs, cleanTerm } from '@/utils/transcript'

const seg = (start, end, text) => ({ start, end, text })
const w = (word, start) => ({ word, start, end: start + 0.3 })

describe('groupWordsBySentence', () => {
  describe('grouping words under their sentence', () => {
    test('returns one group per segment, in order', () => {
      const segments = [seg(0, 2, 'The cat'), seg(2, 4, 'is here.')]
      const words = [w('The', 0), w('cat', 0.6), w('is', 2), w('here', 2.5)]

      const groups = groupWordsBySentence(segments, words)

      expect(groups).toHaveLength(2)
      expect(groups.map((g) => g.sentence)).toEqual(['The cat', 'is here.'])
      expect(groups.map((g) => g.start)).toEqual([0, 2])
    })

    test('assigns each word to the segment whose time span contains its start', () => {
      const segments = [seg(0, 2, 'The cat'), seg(2, 4, 'is here.')]
      const words = [w('The', 0), w('cat', 0.6), w('is', 2), w('here', 2.5)]

      const groups = groupWordsBySentence(segments, words)

      expect(groups[0].words.map((x) => x.display.trim())).toEqual(['The', 'cat'])
      expect(groups[1].words.map((x) => x.display.trim())).toEqual(['is', 'here.'])
    })

    test('keeps each word global index (its position in the flat words array)', () => {
      const segments = [seg(0, 2, 'The cat'), seg(2, 4, 'is here.')]
      const words = [w('The', 0), w('cat', 0.6), w('is', 2), w('here', 2.5)]

      const groups = groupWordsBySentence(segments, words)

      expect(groups[0].words.map((x) => x.index)).toEqual([0, 1])
      expect(groups[1].words.map((x) => x.index)).toEqual([2, 3])
    })

    test('first segment claims words that start before it; last claims words after it', () => {
      const segments = [seg(1, 2, 'one'), seg(2, 3, 'two')]
      const words = [w('one', 0.4), w('two', 5)]

      const groups = groupWordsBySentence(segments, words)

      expect(groups[0].words.map((x) => x.index)).toEqual([0])
      expect(groups[1].words.map((x) => x.index)).toEqual([1])
    })
  })

  describe('display reconstruction preserves the sentence verbatim', () => {
    test('keeps spaces between space-delimited words', () => {
      const groups = groupWordsBySentence(
        [seg(0, 2, 'The quick fox')],
        [w('The', 0), w('quick', 0.5), w('fox', 1)]
      )

      expect(groups[0].words.map((x) => x.display)).toEqual(['The ', 'quick ', 'fox'])
    })

    test('retains sentence-final punctuation on the last word', () => {
      const groups = groupWordsBySentence([seg(0, 2, 'is here.')], [w('is', 0), w('here', 0.5)])

      expect(groups[0].words.map((x) => x.display)).toEqual(['is ', 'here.'])
    })

    test('keeps mid-sentence punctuation attached to a word', () => {
      const groups = groupWordsBySentence(
        [seg(0, 2, 'Hello, world')],
        [w('Hello', 0), w('world', 0.5)]
      )

      expect(groups[0].words.map((x) => x.display)).toEqual(['Hello, ', 'world'])
    })

    test('inserts no spaces for space-less scripts (Japanese)', () => {
      const groups = groupWordsBySentence(
        [seg(0, 2, '猫がいる')],
        [w('猫', 0), w('が', 0.3), w('いる', 0.6)]
      )

      expect(groups[0].words.map((x) => x.display)).toEqual(['猫', 'が', 'いる'])
    })

    test('slices tile the whole sentence with nothing lost', () => {
      const text = 'A B, c.'
      const groups = groupWordsBySentence([seg(0, 2, text)], [w('A', 0), w('B', 0.3), w('c', 0.6)])

      expect(groups[0].words.map((x) => x.display).join('')).toBe(text)
    })
  })

  describe('edge cases', () => {
    test('returns no groups when there are no segments', () => {
      expect(groupWordsBySentence([], [w('hi', 0)])).toEqual([])
    })

    test('yields a group with no words when the transcript has no word timings', () => {
      const groups = groupWordsBySentence([seg(0, 2, 'no words')], [])

      expect(groups).toHaveLength(1)
      expect(groups[0].words).toEqual([])
    })

    test('still renders the sentence verbatim when a word is not found in the text', () => {
      const groups = groupWordsBySentence([seg(0, 2, 'five apples')], [w('5', 0), w('apples', 0.5)])

      const displays = groups[0].words.map((x) => x.display)
      expect(displays).toHaveLength(2)
      expect(displays.join('')).toBe('five apples')
    })
  })
})

describe('groupWordsBySentence — translation passthrough', () => {
  test('copies translation from the segment onto the sentence group', () => {
    const segments = [
      { start: 0, end: 2, text: 'Hello world', translation: 'こんにちは世界' },
      { start: 2, end: 4, text: 'How are you', translation: 'お元気ですか' }
    ]
    const words = [w('Hello', 0), w('world', 0.6), w('How', 2), w('are', 2.4), w('you', 2.8)]

    const groups = groupWordsBySentence(segments, words)

    expect(groups[0].translation).toBe('こんにちは世界')
    expect(groups[1].translation).toBe('お元気ですか')
  })

  test('leaves translation undefined when the segment has none', () => {
    const groups = groupWordsBySentence([seg(0, 2, 'The cat')], [w('The', 0), w('cat', 0.6)])

    expect(groups[0].translation).toBeUndefined()
  })
})

describe('groupWordsBySentence — reading passthrough', () => {
  test('copies each word reading onto its display word', () => {
    const words = [
      { word: '猫', start: 0, end: 0.3, reading: 'ねこ' },
      { word: 'が', start: 0.3, end: 0.6, reading: '' },
      { word: '好き', start: 0.6, end: 0.9, reading: 'すき' }
    ]

    const groups = groupWordsBySentence([seg(0, 2, '猫が好き')], words, '猫が好き')

    expect(groups[0].words.map((d) => d.reading)).toEqual(['ねこ', '', 'すき'])
  })

  test('leaves reading undefined when the word has none', () => {
    const groups = groupWordsBySentence([seg(0, 2, 'The cat')], [w('The', 0), w('cat', 0.6)])

    expect(groups[0].words[0].reading).toBeUndefined()
  })
})

describe('groupWordsBySentence — inter-sentence spacing invariant', () => {
  test('preserves the space between sentences in the word display slices', () => {
    // "Hello world. How are you?" — ". " between sentences stays on the last
    // word of sentence 1, not dropped.
    const text = 'Hello world. How are you?'
    const segments = [
      { start: 0, end: 1.5, text: 'Hello world.' },
      { start: 1.5, end: 3, text: 'How are you?' }
    ]
    const words = [w('Hello', 0), w('world', 0.6), w('How', 1.5), w('are', 1.9), w('you', 2.3)]

    const groups = groupWordsBySentence(segments, words, text)

    // The two groups together reproduce the full text verbatim
    const allDisplay = groups.flatMap((g) => g.words.map((x) => x.display)).join('')
    expect(allDisplay).toBe(text)

    // The period + space that sits between sentences belongs to sentence 1's last word
    expect(groups[0].words.at(-1).display).toBe('world. ')
    // Sentence 2 starts clean, no leading space swallowed
    expect(groups[1].words[0].display).toBe('How ')
  })

  test('inserts no space between sentences for space-less scripts (Japanese)', () => {
    // "猫がいる。犬もいる。" — no space separating the sentences
    const text = '猫がいる。犬もいる。'
    const segments = [
      { start: 0, end: 1, text: '猫がいる。' },
      { start: 1, end: 2, text: '犬もいる。' }
    ]
    const words = [
      w('猫', 0),
      w('が', 0.2),
      w('いる', 0.4),
      w('犬', 1),
      w('も', 1.2),
      w('いる', 1.4)
    ]

    const groups = groupWordsBySentence(segments, words, text)

    const allDisplay = groups.flatMap((g) => g.words.map((x) => x.display)).join('')
    expect(allDisplay).toBe(text)

    // Last word of sentence 1 takes the closing punctuation with no trailing space
    expect(groups[0].words.at(-1).display).toBe('いる。')
    // First word of sentence 2 has no leading space
    expect(groups[1].words[0].display).toBe('犬')
  })
})

describe('groupSentencesIntoParagraphs', () => {
  const sentence = (index, start, end) => ({
    index,
    sentence: `sentence ${index}`,
    start,
    end,
    words: []
  })

  test('the first sentence always starts a new paragraph', () => {
    const sentences = [sentence(0, 0, 1)]
    const paragraphs = groupSentencesIntoParagraphs(sentences)

    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]).toHaveLength(1)
  })

  test('returns an empty array for an empty input', () => {
    expect(groupSentencesIntoParagraphs([])).toEqual([])
  })

  test('keeps sentences with a gap <= threshold in the same paragraph', () => {
    // gap = 0.5, threshold default = 0.8 → same paragraph
    const sentences = [sentence(0, 0, 1), sentence(1, 1.5, 2.5), sentence(2, 3, 4)]
    const paragraphs = groupSentencesIntoParagraphs(sentences)

    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]).toHaveLength(3)
  })

  test('starts a new paragraph when the gap exceeds the threshold', () => {
    // gap = 1.2 > 0.8 → new paragraph
    const sentences = [sentence(0, 0, 1), sentence(1, 2.2, 3)]
    const paragraphs = groupSentencesIntoParagraphs(sentences)

    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveLength(1)
    expect(paragraphs[1]).toHaveLength(1)
  })

  test('does NOT split when gap equals exactly the threshold', () => {
    // gap = 0.8, threshold = 0.8 — "> gap" is strict, equal stays together
    const sentences = [sentence(0, 0, 1), sentence(1, 1.8, 2.5)]
    const paragraphs = groupSentencesIntoParagraphs(sentences)

    expect(paragraphs).toHaveLength(1)
  })

  test('splits at the right sentence when only one gap in many exceeds threshold', () => {
    const sentences = [
      sentence(0, 0, 1),
      sentence(1, 1.3, 2.1),
      sentence(2, 2.3, 3), // gap from s1: 0.2 — same paragraph
      sentence(3, 4.5, 5.5) // gap from s2: 1.5 > 0.8 — new paragraph
    ]
    const paragraphs = groupSentencesIntoParagraphs(sentences)

    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveLength(3)
    expect(paragraphs[1]).toHaveLength(1)
    expect(paragraphs[1][0].index).toBe(3)
  })

  test('respects a custom gap threshold', () => {
    // gap = 0.5 — below default 0.8 but above custom 0.3
    const sentences = [sentence(0, 0, 1), sentence(1, 1.5, 2)]
    const paragraphs = groupSentencesIntoParagraphs(sentences, 0.3)

    expect(paragraphs).toHaveLength(2)
  })

  test('preserves all sentences across paragraphs', () => {
    const sentences = [sentence(0, 0, 1), sentence(1, 2, 3), sentence(2, 4, 5), sentence(3, 5.2, 6)]
    const flat = groupSentencesIntoParagraphs(sentences).flat()

    expect(flat).toHaveLength(4)
    expect(flat.map((s) => s.index)).toEqual([0, 1, 2, 3])
  })
})

describe('cleanTerm', () => {
  test('strips trailing punctuation and whitespace', () => {
    expect(cleanTerm('world. ')).toBe('world')
    expect(cleanTerm('you?')).toBe('you')
  })

  test('strips leading punctuation', () => {
    expect(cleanTerm('"Hello')).toBe('Hello')
  })

  test('strips CJK punctuation', () => {
    expect(cleanTerm('你好，')).toBe('你好')
    expect(cleanTerm('吗？')).toBe('吗')
  })

  test('keeps punctuation inside a term', () => {
    expect(cleanTerm("don't.")).toBe("don't")
    expect(cleanTerm('well-being,')).toBe('well-being')
  })

  test('returns empty string for punctuation-only tokens', () => {
    expect(cleanTerm('…')).toBe('')
    expect(cleanTerm('  ')).toBe('')
  })
})
