import { computed, ref, shallowRef, toValue, useTemplateRef, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { useToast } from '@/composables/toast'
import { useLessonQuery, useLessonAudioUrlQuery } from '@/api/lessons'
import { useMemberCardIndexQuery } from '@/api/cards'
import { useMemberDecksQuery } from '@/api/decks'
import { useAudioPlayer } from './audio-player'
import { useTranscriptSync } from './transcript-sync'
import { groupWordsBySentence } from '@/utils/transcript'
import {
  buildCardTermMap,
  decksForTerm,
  matchCardsInWords,
  matchesByWord,
  type CardMatch
} from '@/utils/transcript-match'

// Translate into the app language. A per-member target language can replace this
// later; admin-only v1 is English.
const TARGET_LANG = 'English'

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
  // Each sentence renders as its own block (one interlinear gloss apiece), evenly
  // spaced — see the reader's transcript view.
  const paragraphs = computed(() => {
    const segments = lesson.value?.transcript.segments ?? []
    return groupWordsBySentence(segments, words.value, lesson.value?.transcript.text)
  })

  // The member-wide card index, mapped to normalized term → decks. Fetched once
  // and reused across lessons; absent until it loads, so matches start empty.
  const { data: card_index } = useMemberCardIndexQuery()
  const card_terms = computed(() => buildCardTermMap(card_index.value ?? []))

  // Decks are already in cache for this page (the add-card control reads them);
  // reuse them to colour each highlight by its owning deck's cover.
  const { data: decks } = useMemberDecksQuery()

  const flat_words = computed(() => paragraphs.value.flatMap((p) => p.words))

  // Stable shallowRef: only emits a new Map when the match content actually
  // changes. Pinia Colada's stale-while-revalidate hands decks/card_index a new
  // array reference on every background fetch even when nothing changed — without
  // this guard each refetch would trigger paintMatchedWords on the full transcript.
  const matches = shallowRef<Map<number, CardMatch>>(new Map())
  watch(
    () => matchesByWord(matchCardsInWords(flat_words.value, card_terms.value).map(themeMatch)),
    (next) => {
      const prev = matches.value
      if (prev.size === next.size) {
        let same = true
        for (const [k, v] of next) {
          const p = prev.get(k)
          if (
            !p ||
            p.lo !== v.lo ||
            p.hi !== v.hi ||
            p.theme !== v.theme ||
            p.theme_dark !== v.theme_dark
          ) {
            same = false
            break
          }
        }
        if (same) return
      }
      matches.value = next
    },
    { immediate: true }
  )

  const audio_path = computed(() => lesson.value?.audio_path)
  const { data: audio_url } = useLessonAudioUrlQuery(audio_path)

  const audio_el = useTemplateRef<HTMLAudioElement>('audio')
  const player = useAudioPlayer(audio_el)
  const { active_index: active_word } = useTranscriptSync(words, player.current_time)

  const selection = ref<TermSelection | null>(null)
  const popover_open = ref(false)

  // The decks already holding the open term — empty when it isn't a card yet.
  // Drives the term panel's add-button state regardless of how the term was
  // selected (tapping a highlight or hand-selecting a range that happens to match).
  const selected_term_decks = computed(() =>
    selection.value ? decksForTerm(card_terms.value, selection.value.term) : []
  )

  watch(error, (err) => {
    if (err) toast.error(err.message)
  })

  // Colour a match by the cover of the first of its decks in the member's list:
  // a single-deck term gets that deck, a multi-deck term a deterministic home.
  function themeMatch(match: CardMatch): CardMatch {
    const ids = new Set(match.deck_ids)
    const cover = decks.value?.find((deck) => ids.has(deck.id))?.cover_config
    return { ...match, theme: cover?.theme, theme_dark: cover?.theme_dark }
  }

  /**
   * Show the translation for a tapped/selected term. Pauses playback so the term
   * holds still while it's read. Stores the standing selection and opens — the
   * view decides where it surfaces (rect-anchored popover on desktop, in the
   * footer in place of the toolbar on mobile).
   */
  function openTerm(next: TermSelection) {
    emitSfx('pop_up_pop')
    player.pause()

    selection.value = next
    popover_open.value = true
  }

  function closeTerm() {
    popover_open.value = false
  }

  /** Seek to the desktop popover's term and resume — its standing selection. */
  function playFromHere() {
    if (selection.value) playFromWord(selection.value.word_index)
  }

  /** Play just the desktop popover's term — its standing selection. */
  function playClip() {
    if (selection.value) playWordRange(selection.value.word_index, selection.value.word_end_index)
  }

  // Seek to a word's start time, resume playback, and dismiss the open term
  // surface (popover on desktop, footer card on mobile).
  function playFromWord(word_index: number) {
    const start = words.value[word_index]?.start
    if (start === undefined) return

    player.seek(start)
    player.play()
    closeTerm()
  }

  // Play only the selected phrase — its first word's start to its last word's end
  // — then stop. Leaves the term surface open so its translation stays readable.
  function playWordRange(first_index: number, last_index: number) {
    const start = words.value[first_index]?.start
    const end = words.value[last_index]?.end
    if (start === undefined || end === undefined) return

    player.playClip(start, end)
  }

  return {
    lesson,
    words,
    paragraphs,
    matches,
    audio_url,
    active_word,
    selection,
    selected_term_decks,
    popover_open,
    target_lang: TARGET_LANG,
    openTerm,
    closeTerm,
    playFromHere,
    playClip,
    player
  }
}
