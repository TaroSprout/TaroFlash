import { describe, test, expect } from 'vite-plus/test'
import {
  groupWordsBySentence,
  groupSentencesIntoParagraphs,
  mergeSentencesToParagraph,
  cleanTerm,
  markTermInSentence
} from '@/utils/transcript'

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
  const sentence = (index, start, end, break_strength) => ({
    index,
    sentence: `sentence ${index}`,
    start,
    end,
    break_strength,
    words: []
  })

  test('the first sentence always starts a new paragraph', () => {
    const sentences = [sentence(0, 0, 1, null)]
    const paragraphs = groupSentencesIntoParagraphs(sentences, 0.45)

    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]).toHaveLength(1)
  })

  test('returns an empty array for an empty input', () => {
    expect(groupSentencesIntoParagraphs([], 0.45)).toEqual([])
  })

  test('splits strictly above the threshold, not at or below it', () => {
    const at_threshold = [sentence(0, 0, 1, null), sentence(1, 1, 2, 0.45)]
    const above_threshold = [sentence(0, 0, 1, null), sentence(1, 1, 2, 0.46)]

    expect(groupSentencesIntoParagraphs(at_threshold, 0.45)).toHaveLength(1)
    expect(groupSentencesIntoParagraphs(above_threshold, 0.45)).toHaveLength(2)
  })

  test('a null break_strength never splits, even with every other sentence null', () => {
    const sentences = [sentence(0, 0, 1, null), sentence(1, 1, 2, null), sentence(2, 2, 3, null)]

    const paragraphs = groupSentencesIntoParagraphs(sentences, 0.15)

    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]).toHaveLength(3)
  })

  test('an absent break_strength never splits', () => {
    const sentences = [
      { index: 0, sentence: 'a', start: 0, end: 1, words: [] },
      { index: 1, sentence: 'b', start: 1, end: 2, words: [] }
    ]

    expect(groupSentencesIntoParagraphs(sentences, 0.15)).toHaveLength(1)
  })

  test('splits at the sentence whose scored break exceeds the threshold', () => {
    const sentences = [
      sentence(0, 0, 1, null),
      sentence(1, 1, 2, 0.2), // below threshold — stays
      sentence(2, 2, 3, 0.9) // above threshold — splits here
    ]

    const paragraphs = groupSentencesIntoParagraphs(sentences, 0.45)

    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveLength(2)
    expect(paragraphs[1]).toHaveLength(1)
    expect(paragraphs[1][0].index).toBe(2)
  })

  test('force_break_starts forces a break at a matching sentence start regardless of score', () => {
    const sentences = [sentence(0, 0, 1, null), sentence(1, 1, 2, 0)]

    const paragraphs = groupSentencesIntoParagraphs(sentences, 0.45, new Set([1]))

    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[1][0].index).toBe(1)
  })

  test('preserves all sentences across paragraphs', () => {
    const sentences = [
      sentence(0, 0, 1, null),
      sentence(1, 1, 2, 0.9),
      sentence(2, 2, 3, 0.1),
      sentence(3, 3, 4, 0.9)
    ]
    const flat = groupSentencesIntoParagraphs(sentences, 0.45).flat()

    expect(flat).toHaveLength(4)
    expect(flat.map((s) => s.index)).toEqual([0, 1, 2, 3])
  })
})

describe('mergeSentencesToParagraph', () => {
  const sentence = (index, sentence_text, start, end, words, translation) => ({
    index,
    sentence: sentence_text,
    start,
    end,
    translation,
    words
  })

  test('concatenates source sentences with a space, joined', () => {
    const group = [sentence(0, 'Hello world.', 0, 1, []), sentence(1, 'How are you?', 1, 2, [])]

    expect(mergeSentencesToParagraph(group).sentence).toBe('Hello world. How are you?')
  })

  test('joins the sentence translations, skipping sentences with none', () => {
    const group = [
      sentence(0, 'a', 0, 1, [], 'こんにちは'),
      sentence(1, 'b', 1, 2, [], undefined),
      sentence(2, 'c', 2, 3, [], 'お元気ですか')
    ]

    expect(mergeSentencesToParagraph(group).translation).toBe('こんにちは お元気ですか')
  })

  test('leaves translation undefined when no sentence in the group has one', () => {
    const group = [sentence(0, 'a', 0, 1, []), sentence(1, 'b', 1, 2, [])]

    expect(mergeSentencesToParagraph(group).translation).toBeUndefined()
  })

  test('keeps the first sentence index as the merged paragraph identity', () => {
    const group = [sentence(5, 'a', 0, 1, []), sentence(6, 'b', 1, 2, [])]

    expect(mergeSentencesToParagraph(group).index).toBe(5)
  })

  test('spans from the first sentence start to the last sentence end', () => {
    const group = [sentence(0, 'a', 1.5, 2.5, []), sentence(1, 'b', 2.5, 4, [])]

    const merged = mergeSentencesToParagraph(group)
    expect(merged.start).toBe(1.5)
    expect(merged.end).toBe(4)
  })

  test('flattens words from every sentence, keeping their global indices', () => {
    const group = [
      sentence(0, 'a', 0, 1, [
        { index: 0, display: 'a' },
        { index: 1, display: 'b' }
      ]),
      sentence(1, 'c', 1, 2, [{ index: 2, display: 'c' }])
    ]

    const merged = mergeSentencesToParagraph(group)
    expect(merged.words.map((w) => w.index)).toEqual([0, 1, 2])
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

describe('markTermInSentence', () => {
  const w = (display, index) => ({ display, index, start: 0 })

  test('returns sentence unchanged when term appears exactly once', () => {
    const words = [w('go ', 0), w('or ', 1), w('stop', 2)]
    expect(markTermInSentence('go or stop', words, 0, 'go')).toBe('go or stop')
  })

  test('returns sentence unchanged when term does not appear', () => {
    const words = [w('go ', 0), w('or ', 1), w('stop', 2)]
    expect(markTermInSentence('go or stop', words, 0, 'run')).toBe('go or stop')
  })

  test('marks first occurrence when word 0 is selected (first of two identical terms)', () => {
    const words = [w('go ', 0), w('or ', 1), w('go', 2)]
    expect(markTermInSentence('go or go', words, 0, 'go')).toBe('[go] or go')
  })

  test('marks second occurrence when a preceding word advances the cursor past the first', () => {
    const words = [w('go ', 0), w('or ', 1), w('go', 2)]
    expect(markTermInSentence('go or go', words, 2, 'go')).toBe('go or [go]')
  })

  test('CJK/space-less script marks the correct occurrence', () => {
    const words = [w('今天', 0), w('天气', 1), w('今天', 2), w('很冷', 3)]
    expect(markTermInSentence('今天天气今天很冷', words, 2, '今天')).toBe('今天天气[今天]很冷')
  })

  test('returns sentence unchanged when term appears only once even though words have other content', () => {
    const words = [w('the ', 0), w('quick ', 1), w('fox', 2)]
    expect(markTermInSentence('the quick fox', words, 1, 'quick')).toBe('the quick fox')
  })
})
