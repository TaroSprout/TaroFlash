import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type ScrollTarget = string | HTMLElement | null | undefined

// Sub-pixel layout rounding leaves a scrollHeight a hair over clientHeight on content that fits.
const OVERFLOW_SLACK_PX = 1

// How long the measured overflow has to hold still before it counts as the resting one.
const SETTLE_MS = 150

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

function unobserveIfElement(resize_obs: ResizeObserver, node: Node) {
  if (node instanceof Element) resize_obs.unobserve(node)
}

function observeIfElement(resize_obs: ResizeObserver, node: Node) {
  if (node instanceof Element) resize_obs.observe(node)
}

/**
 * Reading position of a scrolling element, kept live while its content changes.
 *
 * Reports how far down the reader is and how much of the content is on screen,
 * both as fractions, so whatever draws the handle never measures the element
 * itself. Re-attaches whenever `target` resolves to a different element.
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
  let settle_timer = 0
  let last_max_scroll = -1

  function schedule() {
    if (frame) return

    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  /** Restarts the settling clock whenever the amount of overflow moves, and measures again once it stops. */
  function trackSettling(max_scroll: number) {
    if (max_scroll === last_max_scroll) return

    last_max_scroll = max_scroll

    window.clearTimeout(settle_timer)
    settle_timer = window.setTimeout(() => {
      settle_timer = 0
      measure()
    }, SETTLE_MS)
  }

  /**
   * Publishes whether the handle belongs on screen.
   *
   * Appearing waits for the overflow to hold still, because a layout that is
   * animating passes through heights it never comes to rest at and a handle
   * shown on one of those flashes in and straight back out. Disappearing is
   * immediate — content that fits can't be scrolled, whatever it does next.
   */
  function reportOverflow(overflows: boolean) {
    if (!overflows) overflowing.value = false
    else if (!settle_timer) overflowing.value = true
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

    trackSettling(max_scroll)
    reportOverflow(max_scroll > OVERFLOW_SLACK_PX)

    visible_fraction.value = scroll_height > 0 ? client_height / scroll_height : 0
    progress.value = max_scroll > 0 ? scroll_top / max_scroll : 0
  }

  /** Starts watching the element and every direct child for a size change. */
  function observeContent() {
    if (!el || !resize_obs) return

    resize_obs.observe(el)

    // The element's own box never changes when content grows inside it, so the children report growth.
    for (const child of el.children) resize_obs.observe(child)
  }

  /** Follows children in and out of the element, so a list only costs work for the rows that moved. */
  function trackChildren(records: MutationRecord[]) {
    if (!resize_obs) return

    for (const record of records) {
      for (const node of record.removedNodes) unobserveIfElement(resize_obs, node)
      for (const node of record.addedNodes) observeIfElement(resize_obs, node)
    }
  }

  function attachPage() {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })

    // Never observe the page's own boxes: they're height-pinned and never grow. →[K:page-boxes-are-height-pinned]
    mutation_obs = new MutationObserver(schedule)
    mutation_obs.observe(document.body, { childList: true, subtree: true, attributes: true })
  }

  function attachElement(scroller: HTMLElement) {
    scroller.addEventListener('scroll', schedule, { passive: true })

    // A hidden host reports a size of 0 until it's revealed, which only an observer catches. →[K:scroll-region-hidden-host-measures-zero]
    resize_obs = new ResizeObserver(schedule)
    observeContent()

    mutation_obs = new MutationObserver((records) => {
      trackChildren(records)
      schedule()
    })
    mutation_obs.observe(scroller, { childList: true })
  }

  function detach() {
    cancelAnimationFrame(frame)
    frame = 0

    window.clearTimeout(settle_timer)
    settle_timer = 0
    last_max_scroll = -1

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
    // Hold the first lookup until mount — a selector searched during setup finds nothing and never retries.
    () => (mounted.value ? resolveTarget(target.value) : null),
    (next) => attach(next),
    { flush: 'post' }
  )

  return { overflowing, progress, visible_fraction, scrollToProgress, measure }
}
