import { computed, toValue, type MaybeRefOrGetter } from 'vue'

type Timed = { start: number }

/**
 * Count how many items have started by time `t` (start <= t), via an upper-bound
 * binary search. Assumes `items` is sorted by start, so it stays cheap on every
 * rAF tick even for long transcripts.
 */
function countStarted(items: Timed[], t: number): number {
  let lo = 0
  let hi = items.length

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (items[mid].start <= t) lo = mid + 1
    else hi = mid
  }

  return lo
}

/**
 * Map the audio's current time to the active timed item — a segment or a word.
 *
 * Returns the index of the latest item that has started (start <= t), so the
 * item stays highlighted through the silent gap until the next one begins —
 * smoother than going dark between them. Returns -1 before the first item starts.
 *
 * @example
 * const { active_index } = useTranscriptSync(() => lesson.transcript.words ?? [], current_time)
 */
export function useTranscriptSync(
  items: MaybeRefOrGetter<Timed[]>,
  current_time: MaybeRefOrGetter<number>
) {
  // The active item is the last one that has started; -1 when none have yet.
  const active_index = computed(() => countStarted(toValue(items), toValue(current_time)) - 1)

  return { active_index }
}
