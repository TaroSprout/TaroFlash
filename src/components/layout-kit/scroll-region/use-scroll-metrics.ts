import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type ScrollTarget = string | HTMLElement | null | undefined

// Sub-pixel layout rounding leaves a scrollHeight a hair over clientHeight on content that fits.
const OVERFLOW_SLACK_PX = 1

function resolveTarget(target: ScrollTarget): HTMLElement | null {
  if (!target) return null
  if (typeof target !== 'string') return target
  if (target === 'body') return document.body
  if (target === 'html') return document.documentElement

  return document.querySelector<HTMLElement>(target)
}

function isPageTarget(el: HTMLElement) {
  return el === document.documentElement || el === document.body
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Reading position of a scrolling element, kept live while its content changes.
 *
 * Reports how far down the reader is and how much of the content is on screen,
 * both as fractions, so whatever draws the handle never measures the element
 * itself. Re-attaches whenever `target` resolves to a different element, which
 * is what makes a target that only appears after the first render work.
 */
export function useScrollMetrics(target: Ref<ScrollTarget>) {
  const overflowing = ref(false)
  const progress = ref(0)
  const visible_fraction = ref(0)

  const mounted = ref(false)

  let el: HTMLElement | null = null
  let frame = 0
  let resize_obs: ResizeObserver | null = null
  let mutation_obs: MutationObserver | null = null

  function schedule() {
    if (frame) return

    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  function measure() {
    if (!el) {
      overflowing.value = false
      progress.value = 0
      visible_fraction.value = 0
      return
    }

    const client_height = el.clientHeight
    const scroll_height = el.scrollHeight
    const max_scroll = Math.max(scroll_height - client_height, 0)
    // Rubber-band overscroll pushes scrollTop outside [0, max] on iOS.
    const scroll_top = clamp(el.scrollTop, 0, max_scroll)

    overflowing.value = max_scroll > OVERFLOW_SLACK_PX
    visible_fraction.value = scroll_height > 0 ? client_height / scroll_height : 0
    progress.value = max_scroll > 0 ? scroll_top / max_scroll : 0
  }

  /** Re-points the size observer at the element's current children. */
  function observeContent() {
    if (!el || !resize_obs) return

    resize_obs.disconnect()
    resize_obs.observe(el)

    // The element's own box never changes when content grows inside it, so the
    // children are what report growth.
    for (const child of el.children) resize_obs.observe(child)
  }

  function attachPage() {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })

    mutation_obs = new MutationObserver(schedule)
    mutation_obs.observe(document.body, { childList: true, subtree: true, attributes: true })
  }

  function attachElement(scroller: HTMLElement) {
    scroller.addEventListener('scroll', schedule, { passive: true })

    // A ResizeObserver, not a one-time measure — a host hidden with display:none
    // reports 0 until it's revealed, and only the observer catches that. →[K:scroll-region-hidden-host-measures-zero]
    resize_obs = new ResizeObserver(schedule)
    observeContent()

    mutation_obs = new MutationObserver(() => {
      observeContent()
      schedule()
    })
    mutation_obs.observe(scroller, { childList: true })
  }

  function detach() {
    cancelAnimationFrame(frame)
    frame = 0

    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    el?.removeEventListener('scroll', schedule)

    resize_obs?.disconnect()
    resize_obs = null

    mutation_obs?.disconnect()
    mutation_obs = null

    el = null
  }

  function attach(next: HTMLElement | null) {
    detach()
    el = next

    if (!el) return measure()
    if (isPageTarget(el)) attachPage()
    else attachElement(el)

    measure()
  }

  /** Scrolls the element so `next` — 0 at the top, 1 at the bottom — becomes the reading position. */
  function scrollToProgress(next: number) {
    if (!el) return

    const max_scroll = Math.max(el.scrollHeight - el.clientHeight, 0)
    el.scrollTop = clamp(next, 0, 1) * max_scroll

    measure()
  }

  onMounted(() => (mounted.value = true))
  onBeforeUnmount(detach)

  watch(
    // A target named by selector is only findable once this tree is in the page,
    // so hold the first lookup until mount — searching during setup finds
    // nothing, and a selector never changes to trigger a second attempt.
    () => (mounted.value ? resolveTarget(target.value) : null),
    (next) => attach(next),
    { flush: 'post' }
  )

  return { overflowing, progress, visible_fraction, scrollToProgress, measure }
}
