import { nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import {
  cancelScroll,
  scrollLineIntoView,
  scrollWordIntoDeadzone
} from '@/utils/animations/transcript-scroll'

// Minimal shape of the window virtualizer this composable needs — just enough
// to scroll an unmounted row into view before locating its word.
type WordVirtualizer = Ref<{
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void
}>

/**
 * Keeps the active (playing) word scrolled into view down the page it's
 * reading over, and tracks whether the member has taken the scroll over by
 * hand — independent of word painting/selection, which `useWordSelection`
 * owns. Only meaningful for a host whose reader scrolls the page itself (the
 * continuous transcript); a paged host has no page scroll to follow.
 *
 * @param content - the words host; word lookups scope to it.
 * @param active_word - index of the word the audio is on, or -1 for none.
 * @param virtualizer - the transcript's window virtualizer, used to bring the
 *   active word's row into the DOM when a seek/resume lands outside the
 *   currently rendered range.
 * @param rowIndexOfWord - resolves a word index to its virtualizer row index.
 */
export function useReaderFollow(
  content: Readonly<ShallowRef<HTMLElement | null>>,
  active_word: MaybeRefOrGetter<number>,
  virtualizer: WordVirtualizer,
  rowIndexOfWord: (word_index: number) => number
) {
  // Whether the active-word follow is live. The member taking the scroll over by
  // hand (a wheel/trackpad, or a touch pan that turned out to be a scroll)
  // switches it off so their position holds; the host's resume control turns it
  // back on.
  const following = ref(true)

  // Where the playing word sits relative to the member while follow is off: 'up'
  // when it's scrolled above them, 'down' when it's below. Lets the resume control
  // point the way back to it. Only meaningful while `following` is false.
  const follow_direction = ref<'up' | 'down'>('down')

  let follow_timer: ReturnType<typeof setTimeout> | null = null

  onMounted(() => {
    window.addEventListener('scroll', trackFollowDirection, { passive: true })
    window.addEventListener('wheel', disableFollow, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', trackFollowDirection)
    window.removeEventListener('wheel', disableFollow)
    if (follow_timer !== null) clearTimeout(follow_timer)
  })

  function wordEl(index: number): HTMLElement | null {
    return content.value?.querySelector(`[data-word-index="${index}"]`) ?? null
  }

  async function ensureWordMounted(index: number): Promise<HTMLElement | null> {
    const existing = wordEl(index)
    if (existing) return existing
    virtualizer.value.scrollToIndex(rowIndexOfWord(index), { align: 'center' })
    await nextTick()
    return wordEl(index)
  }

  // Follow the active word into the deadzone. Debounced so rapid scrubbing
  // (many words per frame) settles into a single scroll instead of a jittery
  // chain. 100 ms is short enough to feel responsive during normal playback
  // (~200–300 ms per word) but swallows bursts from fast scrubs.
  function followActiveWord() {
    if (!following.value) return
    if (follow_timer !== null) clearTimeout(follow_timer)
    follow_timer = setTimeout(async () => {
      follow_timer = null
      // Re-check: a manual scroll during the debounce turns follow off, and must win.
      if (!following.value) return
      const index = toValue(active_word)
      if (index < 0) return
      const el = await ensureWordMounted(index)
      if (!el || !following.value) return
      scrollWordIntoDeadzone(el)
    }, 100)
  }

  /**
   * The member started scrolling by hand — a wheel/trackpad, or a selection
   * gesture that turned out to be a scroll: let the follow go and kill the live
   * tween so it stops fighting them. Follow stays off until the member taps the
   * resume control — it never re-arms itself.
   */
  function disableFollow() {
    if (following.value) {
      following.value = false
      cancelScroll()
      updateFollowDirection()
    }

    if (follow_timer !== null) {
      clearTimeout(follow_timer)
      follow_timer = null
    }
  }

  // Point the resume control at the playing word: 'up' when its centre sits above
  // the viewport's, 'down' otherwise. A no-op while following, since the control is
  // hidden then. Window-relative — the control only shows on the page scroller.
  function updateFollowDirection() {
    const index = toValue(active_word)
    if (index < 0) return
    const el = wordEl(index)
    if (!el) return

    const rect = el.getBoundingClientRect()
    follow_direction.value = (rect.top + rect.bottom) / 2 < window.innerHeight / 2 ? 'up' : 'down'
  }

  // The member scrolling by hand (or the word advancing under playback) can flip
  // which way the playing word lies; keep the arrow current while the control shows.
  function trackFollowDirection() {
    if (!following.value) updateFollowDirection()
  }

  /**
   * Re-arm active-word following and smoothly scroll the playing word back into
   * view, so the member who scrolled away can rejoin the read with one tap. Always
   * animates — this is a deliberate tap, not a paused-state seek, so the smooth
   * tween is wanted (and welcome) regardless of play state.
   */
  async function resumeFollow() {
    following.value = true
    const index = toValue(active_word)
    if (index < 0) return
    const el = await ensureWordMounted(index)
    if (el) scrollLineIntoView(el, true)
  }

  // flush: 'post' so any layout settling lands before we measure the word rect.
  watch(
    () => toValue(active_word),
    () => {
      followActiveWord()
      trackFollowDirection()
    },
    { flush: 'post' }
  )

  return { following, follow_direction, resumeFollow, disableFollow }
}
