import { computed, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Map the audio's current time to the active transcript segment.
 *
 * Returns the index of the latest segment that has started (start <= t), so a
 * sentence stays highlighted through the silent gap until the next one begins —
 * smoother than going dark between segments. Returns -1 before the first segment
 * starts. Binary search keeps it cheap on every rAF tick for long transcripts.
 *
 * @example
 * const { active_index } = useTranscriptSync(() => lesson.transcript.segments, current_time)
 */
export function useTranscriptSync(
  segments: MaybeRefOrGetter<TranscriptSegment[]>,
  current_time: MaybeRefOrGetter<number>
) {
  const active_index = computed(() => {
    const segs = toValue(segments)
    const t = toValue(current_time)
    if (segs.length === 0) return -1

    let lo = 0
    let hi = segs.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (segs[mid].start <= t) {
        found = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return found
  })

  return { active_index }
}
