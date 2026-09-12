// Assemble the stored lesson_sentences rows back into the LessonTranscript shape
// the reader consumes, so moving to relational storage stays invisible to it.

/**
 * Rebuild a lesson's transcript from its stored sentence rows.
 *
 * `text` is the word tokens concatenated, not the sentence texts joined — the
 * reader reconstructs each word's display by walking `text`, so it must be the
 * exact word sequence with the tokens' own spacing.
 *
 * @param rows - the lesson's sentences in playback order (ordinal ascending).
 */
export function sentencesToTranscript(rows: LessonSentenceRow[]): LessonTranscript {
  const segments: TranscriptSegment[] = rows.map((row) => ({
    start: row.start_seconds,
    end: row.end_seconds,
    text: row.text,
    translation: row.translation ?? undefined,
    paragraph_gap: row.paragraph_gap,
    break_strength: row.break_strength
  }))

  const words: TranscriptWord[] = rows.flatMap((row) =>
    row.words.map((word, i) => ({
      word: word.word,
      start: word.start,
      end: word.end,
      reading: row.readings?.[i] || undefined
    }))
  )

  const chapters: TranscriptChapter[] = rows
    .filter((row) => row.chapter_title)
    .map((row) => ({ title: row.chapter_title as string, start: row.start_seconds }))

  return {
    text: words.map((word) => word.word).join(''),
    segments,
    words,
    chapters
  }
}
