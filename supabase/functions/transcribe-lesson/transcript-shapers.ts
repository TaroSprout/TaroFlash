// Pure transcript-shaping helpers for the worker's phases — no network, DB, or
// storage calls, so they're colocated here rather than mixed into worker.ts's
// phase orchestration.

import type { Segment, Word, Transcript, SentenceRow } from '../_shared/transcription/transcript.ts'

// Append one already-offset chunk onto the running transcript, dropping the lead
// that overlaps what we already have. Chunks overlap by design (so no word is cut
// at a window edge), so the new chunk re-transcribes the tail of the previous
// one; we keep only segments/words that start at or after the last accepted end.
// A SINGLE boundary (the previous content's last segment end) cuts both segments
// and words, so they stay mutually aligned at the seam — cutting them on separate
// boundaries would orphan words from their sentence.
//
// `text` is rebuilt by concatenating the kept WORD tokens, not the segment texts:
// the reader reconstructs each word's display by walking `text` with indexOf, so
// `text` must be the exact word sequence (Whisper's tokens already carry their own
// spacing). Joining trimmed segment texts instead desynced that walk at every
// seam and collapsed the tail into one giant "word".
export function appendChunk(
  acc: Transcript,
  incoming: { segments: Segment[]; words: Word[] }
): Transcript {
  const boundary = acc.segments.at(-1)?.end ?? -Infinity

  const segments = acc.segments.concat(incoming.segments.filter((s) => s.start >= boundary))
  const words = acc.words.concat(incoming.words.filter((w) => w.start >= boundary))

  return {
    ...acc,
    text: words.map((w) => w.word).join(''),
    segments,
    words
  }
}

/**
 * Which words fall under each segment in [from, to) — a word belongs to segment
 * `i` when its start falls in that segment's span; the first segment also claims
 * words before it, the last claims words after it. The reader (src/utils/transcript.ts's
 * inSegment) applies this same rule independently — change a boundary here and
 * change it there too, or the two disagree on which segment a word belongs to.
 * →[K:segment-assignment-duplicated]
 */
export function assignWordsToSegments(
  words: Word[],
  segments: Segment[],
  from: number,
  to: number
): number[][] {
  const groups: number[][] = []

  for (let i = from; i < to; i++) {
    const lower = i === 0 ? -Infinity : segments[i].start
    const upper = segments[i + 1]?.start ?? Infinity
    const indices: number[] = []
    words.forEach((word, index) => {
      if (word.start >= lower && word.start < upper) indices.push(index)
    })
    groups.push(indices)
  }

  return groups
}

// The stored slice of an already-persisted sentence the transcribe phase needs to
// know where the running transcript ends: how many sentences precede this chunk
// (their count is the next sentence's ordinal), where the last one ends (the
// overlap boundary), and their words (rebuilt into the stitch input).
export type StoredSentence = Pick<SentenceRow, 'start_seconds' | 'end_seconds' | 'text' | 'words'>

// The sentence rows one transcribed chunk adds, ready to upsert. Stitches the
// chunk onto the sentences already stored (dropping the overlap re-transcribed
// from the previous chunk), then splits the newly-kept words under the newly-kept
// sentences and stamps each with the silent gap that precedes it. Ordinals
// continue from the stored count, so a replayed chunk overwrites the same rows.
export function sentenceRowsForChunk(
  existing: StoredSentence[],
  incoming: { segments: Segment[]; words: Word[] }
): SentenceRow[] {
  const acc: Transcript = {
    text: '',
    segments: existing.map((s) => ({ start: s.start_seconds, end: s.end_seconds, text: s.text })),
    words: existing.flatMap((s) => s.words)
  }
  const stitched = appendChunk(acc, incoming)

  const startOrdinal = existing.length
  const newSegments = stitched.segments.slice(startOrdinal)
  const newWords = stitched.words.slice(acc.words.length)
  const groups = assignWordsToSegments(newWords, newSegments, 0, newSegments.length)

  const priorEnd = existing.at(-1)?.end_seconds
  return newSegments.map((seg, k) => {
    const prevEnd = k === 0 ? priorEnd : newSegments[k - 1].end
    return {
      ordinal: startOrdinal + k,
      start_seconds: seg.start,
      end_seconds: seg.end,
      text: seg.text,
      words: groups[k].map((index) => newWords[index]),
      paragraph_gap: prevEnd === undefined ? 0 : Math.max(0, seg.start - prevEnd)
    }
  })
}
