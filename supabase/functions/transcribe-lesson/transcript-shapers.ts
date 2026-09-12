// Pure transcript-shaping helpers for the worker's phases — no network, DB, or
// storage calls, so they're colocated here rather than mixed into worker.ts's
// phase orchestration.

import type { Segment, Word, Transcript } from '../_shared/transcription/transcript.ts'

// A lesson's transcript starts as `{}` (empty jsonb) and grows; coerce whatever
// is stored into the full shape so the stitch/append logic never guards nulls.
export function normalizeTranscript(t: Partial<Transcript> | null | undefined): Transcript {
  return {
    text: t?.text ?? '',
    segments: t?.segments ?? [],
    words: t?.words ?? [],
    chapters: t?.chapters
  }
}

/**
 * Append one already-offset chunk onto the running transcript, dropping the lead
 * that overlaps what we already have. Chunks overlap by design (so no word is cut
 * at a window edge), so the new chunk re-transcribes the tail of the previous
 * one; we keep only segments/words that start at or after the last accepted end.
 * A SINGLE boundary (the previous content's last segment end) cuts both segments
 * and words, so they stay mutually aligned at the seam — cutting them on separate
 * boundaries would orphan words from their sentence.
 *
 * `text` is rebuilt by concatenating the kept WORD tokens, not the segment texts:
 * the reader reconstructs each word's display by walking `text` with indexOf, so
 * `text` must be the exact word sequence (Whisper's tokens already carry their own
 * spacing). Joining trimmed segment texts instead desynced that walk at every
 * seam and collapsed the tail into one giant "word".
 */
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
