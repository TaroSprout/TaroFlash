export type DisplayWord = {
  display: string
  start: number
  index: number
  // Phonetic reading rendered above the word (furigana, pinyin, …), when present.
  reading?: string
}

export type SentenceWords = {
  index: number
  sentence: string
  // English (or target-language) translation of the sentence, shown
  // interlinearly under it; absent until the lesson has been translated.
  translation?: string
  start: number
  end: number
  words: DisplayWord[]
}

// A silent gap longer than this between two sentences reads as a paragraph
// break — a topic shift or a breath the speaker takes between thoughts.
const PARAGRAPH_GAP_SECONDS = 0.8

// Leading/trailing whitespace + punctuation. \p{P} spans Latin and CJK marks
// alike, so this strips a trailing 。 or ? the same way. Anchored to both ends
// only, so punctuation *inside* a term (don't, well-being) is left untouched.
const SURROUNDING_PUNCTUATION = /^[\p{P}\s]+|[\p{P}\s]+$/gu

/**
 * Reduce a tapped or selected token to the bare term for the translator —
 * "world" from "world.", "你好" from "你好，". Returns '' when the token is
 * nothing but punctuation, so callers can skip opening the popover.
 *
 * @example
 * cleanTerm('world.') // 'world'
 */
export function cleanTerm(text: string): string {
  return text.replace(SURROUNDING_PUNCTUATION, '')
}

/**
 * Group word tokens under the sentence (segment) that contains them, with each
 * word's display text reconstructed — original spacing and punctuation intact —
 * from the full transcript `text`. Partitioning the whole text (rather than each
 * trimmed segment in isolation) preserves the spacing *between* sentences too,
 * so it renders correctly in any language, including space-less scripts like
 * Japanese where sentences butt straight up against each other. Each word keeps
 * its global `index` (position in the flat `words` array) so the synced active
 * word can be matched.
 *
 * `text` defaults to the segments joined by spaces; pass the real
 * `transcript.text` so inter-sentence spacing matches the source exactly.
 *
 * @example
 * const groups = groupWordsBySentence(t.segments, t.words ?? [], t.text)
 */
export function groupWordsBySentence(
  segments: TranscriptSegment[],
  words: TranscriptWord[],
  text = segments.map((s) => s.text).join(' ')
): SentenceWords[] {
  const displayed = displayWords(text, words)

  return segments.map((segment, i) => ({
    index: i,
    sentence: segment.text,
    translation: segment.translation,
    start: segment.start,
    end: segment.end,
    words: displayed.filter(inSegment(segments, i))
  }))
}

/**
 * Split sentences into paragraphs at long silent gaps, so the transcript reads
 * as prose instead of one undivided block. Whisper gives no paragraph metadata,
 * so the speaker's pauses stand in for it.
 *
 * @example
 * const paragraphs = groupSentencesIntoParagraphs(groupWordsBySentence(segments, words))
 */
export function groupSentencesIntoParagraphs(
  sentences: SentenceWords[],
  gap = PARAGRAPH_GAP_SECONDS
): SentenceWords[][] {
  const paragraphs: SentenceWords[][] = []

  sentences.forEach((sentence, i) => {
    const prev = sentences[i - 1]
    if (!prev || sentence.start - prev.end > gap) paragraphs.push([])
    paragraphs[paragraphs.length - 1].push(sentence)
  })

  return paragraphs
}

/**
 * Predicate: a word belongs to segment `i` when its start falls inside the
 * segment's time span. The first segment also claims any words that start
 * before it; the last segment claims any that start after it.
 */
function inSegment(segments: TranscriptSegment[], i: number) {
  const lower = i === 0 ? -Infinity : segments[i].start
  const upper = segments[i + 1]?.start ?? Infinity
  return (word: DisplayWord) => word.start >= lower && word.start < upper
}

/**
 * Reconstruct each word's display text by partitioning the transcript into
 * contiguous slices between consecutive word positions. Every character —
 * leading text, inter-word and inter-sentence spaces, and trailing punctuation —
 * lands in exactly one slice, so the spans together reproduce the text verbatim
 * in any language. A token that can't be located (a rare normalization mismatch
 * between Whisper's word and the text) falls back to itself.
 */
function displayWords(text: string, words: TranscriptWord[]): DisplayWord[] {
  const bounds = wordBoundaries(text, words)

  return words.map((word, i) => ({
    display: text.slice(bounds[i], bounds[i + 1]) || word.word.trim(),
    start: word.start,
    index: i,
    reading: word.reading
  }))
}

/**
 * Find where each word starts in the text, returning slice boundaries: the first
 * word claims any leading text (boundary forced to 0) and the last claims the
 * trailing tail (boundary at text length), so the slices tile the whole text.
 */
function wordBoundaries(text: string, words: TranscriptWord[]): number[] {
  const bounds: number[] = []
  let cursor = 0

  words.forEach((word) => {
    const token = word.word.trim()
    const found = text.indexOf(token, cursor)
    bounds.push(found === -1 ? cursor : found)
    if (found !== -1) cursor = found + token.length
  })

  bounds.push(text.length)
  if (bounds.length > 1) bounds[0] = 0
  return bounds
}
