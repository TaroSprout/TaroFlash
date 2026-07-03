import { gsap } from 'gsap'

// Where the active line rests in the scroll viewport (0 = top, 1 = bottom). A
// little above centre keeps the upcoming lines visible while never letting the
// current line jam against the top or bottom edge.
const ANCHOR_RATIO = 0.4
const DURATION = 0.6

// Deadzone boundaries for word-level scroll. Words inside this band don't
// trigger a scroll; words outside snap to SCROLL_ANCHOR.
const DEADZONE_TOP = 0.15
const DEADZONE_BOTTOM = 0.35
const SCROLL_ANCHOR = 0.2

// The transcript always scrolls the page itself — there's no bounded internal
// column on any breakpoint. One proxy tween is enough; a fresh call retargets
// it (and animates from the real current scroll position) instead of fighting
// a stale one.
const state = { y: 0 }

function metrics() {
  const doc = document.documentElement
  return {
    current: window.scrollY,
    viewport: window.innerHeight,
    max: doc.scrollHeight - doc.clientHeight
  }
}

/**
 * Stop any in-flight scroll tween. Used when the member takes the scroll over
 * by hand, so the active-word follow lets go instead of fighting them.
 */
export function cancelScroll() {
  gsap.killTweensOf(state)
}

function runTween(target: number, current: number, animate: boolean) {
  state.y = current
  gsap.killTweensOf(state)

  if (!animate) {
    state.y = target
    window.scrollTo(0, target)
    return
  }

  gsap.to(state, {
    y: target,
    duration: DURATION,
    ease: 'power3.out',
    onUpdate: () => window.scrollTo(0, state.y)
  })
}

/**
 * Lift `el` clear above `limit_bottom` (a viewport Y, e.g. a fixed footer's top
 * edge) by scrolling the page up just enough. No-op when `el` already sits
 * above the limit. Used to re-clear a selected word after the term footer grows.
 *
 * Pass `animate = false` to jump instantly — same iOS Safari rAF-starvation
 * caveat as `scrollLineIntoView` applies here.
 */
export function scrollClearOf(el: HTMLElement, limit_bottom: number, animate = true) {
  const overshoot = el.getBoundingClientRect().bottom - limit_bottom
  if (overshoot <= 0) return

  const { current, max } = metrics()
  const target = Math.max(0, Math.min(max, current + overshoot))
  runTween(target, current, animate)
}

/**
 * Scroll the page so `el` rests ~40% down the viewport, clamped to the
 * scrollable range. Used to follow the active transcript line as audio plays.
 * ScrollToPlugin isn't registered, so we tween a proxy and write the scroll
 * offset in onUpdate.
 *
 * Pass `animate = false` to jump instantly. A rAF-driven `window.scrollTo` tween
 * starves rAF on iOS Safari (it suspends rAF mid programmatic scroll), so the
 * paused-state repositioning — a resume seek, a scrub, a skip — must jump rather
 * than tween, or the audio tick and page lock up the moment playback starts.
 */
export function scrollLineIntoView(el: HTMLElement, animate = true) {
  const el_rect = el.getBoundingClientRect()
  const { current, viewport, max } = metrics()

  const el_top_within = el_rect.top + current
  const desired = el_top_within - viewport * ANCHOR_RATIO + el_rect.height / 2
  const target = Math.max(0, Math.min(max, desired))
  runTween(target, current, animate)
}

/**
 * Scroll the page only when `el` has drifted outside the deadzone band
 * (15%–35% of the viewport). When outside, snaps it to the top of the band.
 * No-ops when the word is already visible inside the band, so mid-sentence
 * words don't cause jitter. Same iOS Safari rules as `scrollLineIntoView`.
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
  runTween(target, current, animate)
}
