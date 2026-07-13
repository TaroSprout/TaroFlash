import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const EPSILON = 1
const PAGE_SIZE = 3

/**
 * Detects horizontal overflow and scroll position on the review-inbox card
 * strip, exposing scroll-by-page navigation. The floating prev/next
 * buttons only render when the strip overflows, and disable individually
 * once there's nothing left to scroll toward in that direction.
 */
export function useReviewInboxScroll(due_decks: () => Deck[]) {
  const items_el = ref<HTMLElement | null>(null)
  const has_overflow = ref(false)
  const can_scroll_prev = ref(false)
  const can_scroll_next = ref(false)

  let resize_observer: ResizeObserver | undefined

  function updateScrollState() {
    const el = items_el.value
    has_overflow.value = !!el && el.scrollWidth > el.clientWidth + EPSILON
    can_scroll_prev.value = !!el && el.scrollLeft > EPSILON
    can_scroll_next.value = !!el && el.scrollLeft < el.scrollWidth - el.clientWidth - EPSILON
  }

  onMounted(() => {
    updateScrollState()
    resize_observer = new ResizeObserver(updateScrollState)
    if (items_el.value) {
      resize_observer.observe(items_el.value)
      items_el.value.addEventListener('scroll', updateScrollState, { passive: true })
    }
  })

  onUnmounted(() => {
    resize_observer?.disconnect()
    items_el.value?.removeEventListener('scroll', updateScrollState)
  })

  watch(
    () => due_decks().length,
    () => nextTick(updateScrollState)
  )

  function scrollByPage(dir: 1 | -1) {
    const el = items_el.value
    if (!el) return
    const step = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth
    const max_scroll_left = el.scrollWidth - el.clientWidth
    const target = el.scrollLeft + dir * (step + 4) * PAGE_SIZE
    el.scrollTo({ left: Math.max(0, Math.min(target, max_scroll_left)), behavior: 'smooth' })
  }

  function prev() {
    scrollByPage(-1)
  }

  function next() {
    scrollByPage(1)
  }

  return { items_el, has_overflow, can_scroll_prev, can_scroll_next, prev, next }
}
