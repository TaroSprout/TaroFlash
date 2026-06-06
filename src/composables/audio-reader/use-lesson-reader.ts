import { computed, ref, toValue, useTemplateRef, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useToast } from '@/composables/toast'
import { useLessonQuery, useLessonAudioUrlQuery } from '@/api/lessons'
import { useAudioPlayer } from './use-audio-player'
import { useTranscriptSync } from './use-transcript-sync'
import { groupWordsBySentence, groupSentencesIntoParagraphs } from '@/utils/transcript'

/**
 * Orchestrate a lesson for reading: fetch it, shape its transcript into
 * paragraphs, stream the audio, sync the active word to playback, and hold the
 * term-translation popover state. The view binds the returned values to its
 * template and otherwise stays presentation-only.
 *
 * Binds the audio element by name — the host template must declare `ref="audio"`.
 *
 * @param id - the lesson id (route param), reactive.
 * @example
 * const reader = useLessonReader(() => Number(props.id))
 */
export function useLessonReader(id: MaybeRefOrGetter<number>) {
  const toast = useToast()

  const lesson_id = computed(() => toValue(id))
  const { data: lesson, error } = useLessonQuery(lesson_id)

  const words = computed(() => lesson.value?.transcript.words ?? [])
  const paragraphs = computed(() => {
    const segments = lesson.value?.transcript.segments ?? []
    const groups = groupWordsBySentence(segments, words.value, lesson.value?.transcript.text)
    return groupSentencesIntoParagraphs(groups)
  })

  const audio_path = computed(() => lesson.value?.audio_path)
  const { data: audio_url } = useLessonAudioUrlQuery(audio_path)

  const audio_el = useTemplateRef<HTMLAudioElement>('audio')
  const player = useAudioPlayer(audio_el)
  const { active_index: active_word } = useTranscriptSync(words, player.current_time)

  const selection = ref<TermSelection | null>(null)
  const popover_open = ref(false)

  watch(error, (err) => {
    if (err) toast.error(err.message)
  })

  /** Open the translation popover anchored to a tapped/selected term. */
  function openTerm(next: TermSelection) {
    selection.value = next
    popover_open.value = true
  }

  function closeTerm() {
    popover_open.value = false
  }

  return {
    lesson,
    paragraphs,
    audio_url,
    active_word,
    selection,
    popover_open,
    openTerm,
    closeTerm,
    player
  }
}
