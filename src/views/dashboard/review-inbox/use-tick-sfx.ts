import { onBeforeUnmount, watch, type Ref } from 'vue'
import { emitSfx } from '@/sfx/bus'

// Matches the "+4" gap fudge use-scroll.ts uses for its own page-size math,
// so both stay in lockstep with the actual card pitch.
function cardPitch(el: HTMLElement) {
  const card_width = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth
  return card_width + 4
}

/**
 * Plays a tick each time the scroll strip crosses a card-width boundary,
 * quantizing scrollLeft by the card pitch rather than watching visibility —
 * ties the tick to the same distance the paging buttons step by.
 */
export function useReviewInboxTickSfx(items_el: Ref<HTMLElement | null>) {
  let attached_el: HTMLElement | null = null
  let last_index = 0
  let raf = 0

  function onScroll() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const el = attached_el
      if (!el) return

      // Elastic overscroll (iOS rubber-banding) briefly pushes scrollLeft past
      // the real [0, max] range — clamp it so bounce doesn't count as a crossing.
      const max_scroll_left = el.scrollWidth - el.clientWidth
      const scroll_left = Math.min(Math.max(el.scrollLeft, 0), max_scroll_left)

      const index = Math.round(scroll_left / cardPitch(el))
      if (index !== last_index) emitSfx('tap_05', { volume: 0.025 })
      last_index = index
    })
  }

  function detach() {
    attached_el?.removeEventListener('scroll', onScroll)
    attached_el = null
    cancelAnimationFrame(raf)
    raf = 0
  }

  watch(
    items_el,
    (el) => {
      detach()
      if (!el) return

      attached_el = el
      last_index = Math.round(el.scrollLeft / cardPitch(el))
      el.addEventListener('scroll', onScroll, { passive: true })
    },
    { immediate: true }
  )

  onBeforeUnmount(detach)
}
