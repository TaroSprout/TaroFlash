import { computed, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useLessonCollectionQuery, useSetCollectionProgressMutation } from '@/api/lessons'
import type { AudioPlayer } from './audio-player'

// Save at most once per this many seconds of playback progress.
const SAVE_INTERVAL_SECONDS = 5
// A stored offset within this much of the end counts as "finished" — restart the
// chapter rather than resuming on its last word.
const END_EPSILON_SECONDS = 2

/**
 * Persist and restore the member's resume point within a book. On opening a
 * chapter it seeks to the stored offset (only when that chapter is the book's
 * bookmark) and re-bookmarks the chapter; while listening it saves the position
 * — throttled by playback progress, plus on pause, tab-hide, and unmount — so a
 * refresh resumes where they left off. Stays paused; the audio seeks to the
 * stored offset on the first play (iOS only honours a seek inside the tap).
 *
 * One resume point per book: opening a different chapter than the bookmark
 * starts at 0 and makes that chapter the new bookmark.
 *
 * @param collectionId - the book whose resume point is tracked, reactive.
 * @param lessonId - the chapter currently open, reactive.
 * @param player - the audio player driving (and driven by) the position.
 * @returns `restored` — a ComputedRef that flips true once the open chapter has
 *   been positioned at its resume offset, so the view can veil the reader until
 *   then and reveal it already at the right spot (no visible seek jump).
 * @example
 * const { restored } = useReaderProgress(() => collection_id.value, lesson_id, player)
 */
export function useReaderProgress(
  collectionId: MaybeRefOrGetter<number>,
  lessonId: MaybeRefOrGetter<number>,
  player: AudioPlayer
) {
  const { data: collection } = useLessonCollectionQuery(collectionId)
  const set_progress = useSetCollectionProgressMutation()

  // The chapter whose stored offset we've already applied — guards against
  // re-applying when the collection cache is patched under the same chapter, and
  // backs `restored` so the view can veil the reader until positioning is done.
  const restored_lesson = ref<number | null>(null)
  // Playback position (seconds) at the last save; the throttle measures from here.
  let saved_at = 0

  // True once the current chapter has been positioned at its resume offset — the
  // moment it's safe to reveal the reader without showing the seek jump.
  const restored = computed(() => restored_lesson.value === toValue(lessonId))

  function save(position: number) {
    saved_at = position
    set_progress.mutate({
      collection_id: toValue(collectionId),
      lesson_id: toValue(lessonId),
      position_seconds: position
    })
  }

  // Arm the stored offset as the resume point (if this chapter is the bookmark)
  // and re-bookmark the chapter at that offset. Waits for the collection data and
  // the current chapter's audio metadata; runs once per chapter open.
  function restore() {
    const data = collection.value
    const lesson_id = toValue(lessonId)
    if (!data || !player.loaded.value || restored_lesson.value === lesson_id) return

    restored_lesson.value = lesson_id
    const stored = data.last_lesson_id === lesson_id ? (data.last_position_seconds ?? 0) : 0
    const target = stored < player.duration.value - END_EPSILON_SECONDS ? stored : 0

    if (target > 0) player.resumeAt(target)
    save(target)
  }

  function onHidden() {
    if (document.hidden) save(player.current_time.value)
  }

  document.addEventListener('visibilitychange', onHidden)
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onHidden)
    if (player.loaded.value) save(player.current_time.value)
  })

  watch([() => collection.value, player.loaded, () => toValue(lessonId)], restore, {
    immediate: true
  })

  // Throttle by playback progress: write once the position has advanced a step
  // since the last save, never on every animation frame.
  watch(player.current_time, (now) => {
    if (player.is_playing.value && Math.abs(now - saved_at) >= SAVE_INTERVAL_SECONDS) save(now)
  })

  // Flush the exact spot whenever playback settles.
  watch(player.is_playing, (playing) => {
    if (!playing && player.loaded.value) save(player.current_time.value)
  })

  return { restored }
}
