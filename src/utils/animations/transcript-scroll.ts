// Where the active line rests down the screen. Keep it above centre so the
// upcoming lines stay visible and the current one never jams against an edge.
const ANCHOR_RATIO = 0.4

// The band a word may sit in without triggering a scroll. Widen it and the
// followed word drifts; narrow it and every word jitters the page.
const DEADZONE_TOP = 0.15
const DEADZONE_BOTTOM = 0.35
const SCROLL_ANCHOR = 0.2

// The transcript scrolls the page itself — there's no bounded inner column on
// any screen size.
function metrics() {
  const doc = document.documentElement
  return {
    current: window.scrollY,
    viewport: window.innerHeight,
    max: doc.scrollHeight - doc.clientHeight
  }
}

function scrollTo(target: number, animate: boolean) {
  window.scrollTo({ top: target, behavior: animate ? 'smooth' : 'auto' })
}

/**
 * Stops any scroll still in flight, so the follow lets go the moment the member
 * takes over by hand rather than fighting them.
 */
export function cancelScroll() {
  window.scrollTo({ top: window.scrollY, behavior: 'auto' })
}

/**
 * Scrolls just enough to lift an element clear of something covering the bottom
 * of the screen — re-exposing a selected word after the footer grows over it.
 *
 * @param limit_bottom - Screen position of the covering edge.
 */
export function scrollClearOf(el: HTMLElement, limit_bottom: number, animate = true) {
  const overshoot = el.getBoundingClientRect().bottom - limit_bottom
  if (overshoot <= 0) return

  const { current, max } = metrics()
  const target = Math.max(0, Math.min(max, current + overshoot))
  scrollTo(target, animate)
}

/** Follows the line being spoken, parking it a little above centre. */
export function scrollLineIntoView(el: HTMLElement, animate = true) {
  const el_rect = el.getBoundingClientRect()
  const { current, viewport, max } = metrics()

  const el_top_within = el_rect.top + current
  const desired = el_top_within - viewport * ANCHOR_RATIO + el_rect.height / 2
  const target = Math.max(0, Math.min(max, desired))
  scrollTo(target, animate)
}

/**
 * Follows the word being spoken, but only once it has drifted out of the band —
 * so the page holds still through most of a sentence instead of nudging along
 * under every word.
 */
export function scrollWordIntoDeadzone(el: HTMLElement, animate = true) {
  const el_rect = el.getBoundingClientRect()
  const { current, viewport, max } = metrics()

  const el_top_in_vp = el_rect.top
  const el_bottom_in_vp = el_rect.bottom
  const dz_top = viewport * DEADZONE_TOP
  const dz_bottom = viewport * DEADZONE_BOTTOM

  if (el_top_in_vp >= dz_top && el_bottom_in_vp <= dz_bottom) return

  const el_top_within = el_rect.top + current
  const target = Math.max(0, Math.min(max, el_top_within - viewport * SCROLL_ANCHOR))
  scrollTo(target, animate)
}
