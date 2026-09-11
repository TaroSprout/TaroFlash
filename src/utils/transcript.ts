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
  // Silent seconds before this sentence, carried from its stored row; absent on
  // a lesson that predates the column, where the timing gap stands in for it.
  paragraph_gap?: number
  // How strongly a paragraph break belongs before this sentence, 0–1, scored by
  // meaning; null where the paragraphing pass couldn't score it.
  break_strength?: number | null
  words: DisplayWord[]
}

/** How finely the reader breaks the transcript into paragraphs. */
export type ParagraphDensity = 'long' | 'medium' | 'short'

// The break-strength a stored break must exceed to start a new paragraph, per
// density. Long only splits at the strongest breaks (few large paragraphs);
// Short splits at almost every scored break (near sentence-by-sentence).
export const PARAGRAPH_DENSITY_THRESHOLDS: Record<ParagraphDensity, number> = {
  long: 0.7,
  medium: 0.45,
  short: 0.15
}

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
    paragraph_gap: segment.paragraph_gap,
    break_strength: segment.break_strength,
    words: displayed.filter(inSegment(segments, i))
  }))
}

/**
 * Split sentences into paragraphs wherever a stored break scores above the given
 * threshold, so the transcript reads as prose instead of one undivided block.
 *
 * A sentence with no scored break (`break_strength` null/absent) never starts a
 * paragraph on its own — a lesson with no scored breaks renders as one paragraph,
 * with no silence-gap fallback. `force_break_starts` holds sentence start times
 * that always begin a paragraph regardless of score, so a chapter heading still
 * lands on its own paragraph.
 *
 * @param threshold - break-strength cutoff; see PARAGRAPH_DENSITY_THRESHOLDS.
 * @example
 * const groups = groupSentencesIntoParagraphs(sentences, 0.45)
 */
export function groupSentencesIntoParagraphs(
  sentences: SentenceWords[],
  threshold: number,
  force_break_starts: ReadonlySet<number> = new Set()
): SentenceWords[][] {
  const paragraphs: SentenceWords[][] = []

  sentences.forEach((sentence, i) => {
    const prev = sentences[i - 1]
    const scored = sentence.break_strength ?? 0
    const breaks = scored > threshold || force_break_starts.has(sentence.start)
    if (!prev || breaks) paragraphs.push([])
    paragraphs[paragraphs.length - 1].push(sentence)
  })

  return paragraphs
}

/**
 * Fold a group of sentences into one paragraph the reader renders as a single
 * block: the source words flow on as continuous prose, and the sentence
 * translations join into one combined gloss. Keeps the first sentence's index so
 * the paragraph stays a stable, unique row identity across regrouping.
 */
export function mergeSentencesToParagraph(group: SentenceWords[]): SentenceWords {
  const first = group[0]
  const last = group[group.length - 1]

  const translations = group.map((s) => s.translation).filter((t): t is string => !!t)

  return {
    index: first.index,
    sentence: group.map((s) => s.sentence).join(' '),
    translation: translations.length ? translations.join(' ') : undefined,
    start: first.start,
    end: last.end,
    words: group.flatMap((s) => s.words)
  }
}

/**
 * When the selected term appears more than once in the sentence, wrap the
 * selected occurrence in [...] so the translator knows exactly which one
 * was chosen. Returns the sentence unchanged when the term is unambiguous.
 *
 * Walks the words that precede the selection to advance a cursor to the
 * right position, then marks the nearest occurrence at or after the cursor.
 */
export function markTermInSentence(
  sentence: string,
  words: DisplayWord[],
  word_index: number,
  term: string
): string {
  if (sentence.split(term).length - 1 <= 1) return sentence

  let cursor = 0
  for (const word of words) {
    if (word.index >= word_index) break
    const token = word.display.trim()
    if (!token) continue
    const pos = sentence.indexOf(token, cursor)
    if (pos !== -1) cursor = pos + token.length
  }

  const hit = sentence.indexOf(term, cursor)
  if (hit === -1) return sentence
  return sentence.slice(0, hit) + '[' + term + ']' + sentence.slice(hit + term.length)
}

/**
 * Predicate: a word belongs to segment `i` when its start falls inside the
 * segment's time span. The first segment also claims any words that start
 * before it; the last segment claims any that start after it. The worker
 * (assignWordsToSegments in supabase/functions/transcribe-lesson/transcript-shapers.ts)
 * applies this same rule independently — change a boundary here and change it
 * there too, or the two disagree on which segment a word belongs to.
 * →[K:segment-assignment-duplicated]
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
