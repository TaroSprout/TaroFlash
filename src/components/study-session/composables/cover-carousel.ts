import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { gsap } from 'gsap'
import { cycleCoverCard, resetCoverCard } from '@/utils/animations/cover-carousel'

/**
 * Drives the multi-deck cover splash: while the session is on the cover and more
 * than one deck is in play, continuously flips the cover card, revealing the
 * next deck's cover on each flip. Event-driven — each beat schedules the next
 * via the timeline's onComplete — so there's no wall-clock interval to leak.
 *
 * Returns `current_cover`, the cover to display on the splash card while the
 * carousel runs; it's `undefined` when idle so the card falls back to its own
 * deck's cover.
 */
export function useCoverCarousel(
  covers: () => DeckCover[],
  isActive: () => boolean,
  cardEl: () => HTMLElement | undefined
) {
  const index = ref(0)
  const active = computed(() => isActive() && covers().length > 1)
  const current_cover = computed(() =>
    active.value ? covers()[index.value % covers().length] : undefined
  )

  let timeline: gsap.core.Timeline | undefined

  function runBeat() {
    const el = cardEl()
    if (!el || !active.value) return

    timeline = cycleCoverCard(el, () => (index.value += 1))
    timeline.eventCallback('onComplete', runBeat)
  }

  function stop() {
    timeline?.kill()
    timeline = undefined

    const el = cardEl()
    if (el) resetCoverCard(el)
    index.value = 0
  }

  onMounted(() => {
    watch(
      () => active.value && !!cardEl(),
      (ready) => (ready ? runBeat() : stop()),
      { immediate: true }
    )
  })

  onUnmounted(stop)

  return { current_cover }
}
