import { computed, defineAsyncComponent, ref, toValue, useTemplateRef, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useToast } from '@/composables/toast'
import { useModal, type ModalCloseFn } from '@/composables/modal'
import { useMobileBreakpoint } from '@/composables/use-media-query'
import { useLessonQuery, useLessonAudioUrlQuery } from '@/api/lessons'
import { useAudioPlayer } from './use-audio-player'
import { useTranscriptSync } from './use-transcript-sync'
import { groupWordsBySentence } from '@/utils/transcript'

// Translate into the app language. A per-member target language can replace this
// later; admin-only v1 is English.
const TARGET_LANG = 'English'

const TermSheet = defineAsyncComponent(() => import('@/views/audio-reader/term-popover/sheet.vue'))

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
  const modal = useModal()
  const is_mobile = useMobileBreakpoint()

  const lesson_id = computed(() => toValue(id))
  const { data: lesson, error } = useLessonQuery(lesson_id)

  const words = computed(() => lesson.value?.transcript.words ?? [])
  // Each sentence renders as its own block (one interlinear gloss apiece), evenly
  // spaced — see the reader's transcript view.
  const paragraphs = computed(() => {
    const segments = lesson.value?.transcript.segments ?? []
    return groupWordsBySentence(segments, words.value, lesson.value?.transcript.text)
  })

  const audio_path = computed(() => lesson.value?.audio_path)
  const { data: audio_url } = useLessonAudioUrlQuery(audio_path)

  const audio_el = useTemplateRef<HTMLAudioElement>('audio')
  const player = useAudioPlayer(audio_el)
  const { active_index: active_word } = useTranscriptSync(words, player.current_time)

  const selection = ref<TermSelection | null>(null)
  const popover_open = ref(false)

  // The bottom sheet's own close fn while it's open on mobile, so a fresh term
  // selection can dismiss the previous sheet before opening its own.
  let sheet_close: ModalCloseFn<void> | null = null

  watch(error, (err) => {
    if (err) toast.error(err.message)
  })

  /**
   * Show the translation for a tapped/selected term. On a coarse/narrow screen
   * it opens as a bottom sheet (the anchored popover crowds a phone); on desktop
   * it's the rect-anchored popover.
   */
  function openTerm(next: TermSelection) {
    if (is_mobile.value) {
      openTermSheet(next)
      return
    }

    selection.value = next
    popover_open.value = true
  }

  // Route the term through the global modal stack as a mobile sheet, reusing its
  // backdrop, scroll-lock, and slide animation. Resolving (backdrop/esc/close)
  // drops our handle.
  function openTermSheet(next: TermSelection) {
    sheet_close?.()

    const { response, close } = modal.open<void>(TermSheet, {
      mode: 'mobile-sheet',
      backdrop: true,
      props: { term: next.term, sentence: next.sentence, target_lang: TARGET_LANG }
    })
    sheet_close = close
    response.then(() => {
      sheet_close = null
    })
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
    target_lang: TARGET_LANG,
    openTerm,
    closeTerm,
    player
  }
}
