// Where the active line rests in the scroll viewport (0 = top, 1 = bottom). A
// little above centre keeps the upcoming lines visible while never letting the
// current line jam against the top or bottom edge.
const ANCHOR_RATIO = 0.4

// Deadzone boundaries for word-level scroll. Words inside this band don't
// trigger a scroll; words outside snap to SCROLL_ANCHOR.
const DEADZONE_TOP = 0.15
const DEADZONE_BOTTOM = 0.35
const SCROLL_ANCHOR = 0.2

// The transcript always scrolls the page itself — there's no bounded internal
// column on any breakpoint.
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
 * Stop any in-flight smooth scroll. Used when the member takes the scroll over
 * by hand, so the active-word follow lets go instead of fighting them. Issuing
 * a fresh `scrollTo` at the current position interrupts the browser's own
 * smooth-scroll animation immediately.
 */
export function cancelScroll() {
  window.scrollTo({ top: window.scrollY, behavior: 'auto' })
}

/**
 * Lift `el` clear above `limit_bottom` (a viewport Y, e.g. a fixed footer's top
 * edge) by scrolling the page up just enough. No-op when `el` already sits
 * above the limit. Used to re-clear a selected word after the term footer grows.
 */
export function scrollClearOf(el: HTMLElement, limit_bottom: number, animate = true) {
  const overshoot = el.getBoundingClientRect().bottom - limit_bottom
  if (overshoot <= 0) return

  const { current, max } = metrics()
  const target = Math.max(0, Math.min(max, current + overshoot))
  scrollTo(target, animate)
}

/**
 * Scroll the page so `el` rests ~40% down the viewport, clamped to the
 * scrollable range. Used to follow the active transcript line as audio plays.
 */
export function scrollLineIntoView(el: HTMLElement, animate = true) {
  const el_rect = el.getBoundingClientRect()
  const { current, viewport, max } = metrics()

  const el_top_within = el_rect.top + current
  const desired = el_top_within - viewport * ANCHOR_RATIO + el_rect.height / 2
  const target = Math.max(0, Math.min(max, desired))
  scrollTo(target, animate)
}

/**
 * Scroll the page only when `el` has drifted outside the deadzone band
 * (15%–35% of the viewport). When outside, snaps it to the top of the band.
 * No-ops when the word is already visible inside the band, so mid-sentence
 * words don't cause jitter.
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
