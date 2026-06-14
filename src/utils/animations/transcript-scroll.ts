import { gsap } from 'gsap'

// Where the active line rests in the scroll viewport (0 = top, 1 = bottom). A
// little above centre keeps the upcoming lines visible while never letting the
// current line jam against the top or bottom edge.
const ANCHOR_RATIO = 0.4
const DURATION = 0.6

// Deadzone boundaries for word-level scroll. Words inside this band don't
// trigger a scroll; words outside snap to the top of the band.
const DEADZONE_TOP = 0.15
const DEADZONE_BOTTOM = 0.8

// The scroller is the transcript column on desktop, but the whole page (window)
// on mobile, where the column isn't bounded and the document scrolls instead.
type Scroller = HTMLElement | Window

// Per-scroller state so a new call retargets the live tween (and animates from
// the real current scroll position) instead of fighting a stale one.
const stateByScroller = new WeakMap<Scroller, { y: number }>()

function isWindow(scroller: Scroller): scroller is Window {
  return scroller === window
}

// Current scroll offset, viewport height, and max scroll — read from the element
// or from the document when the page itself is the scroller.
function metrics(scroller: Scroller) {
  if (isWindow(scroller)) {
    const doc = document.documentElement
    return {
      current: window.scrollY,
      viewport: window.innerHeight,
      max: doc.scrollHeight - doc.clientHeight,
      top: 0
    }
  }
  return {
    current: scroller.scrollTop,
    viewport: scroller.clientHeight,
    max: scroller.scrollHeight - scroller.clientHeight,
    top: scroller.getBoundingClientRect().top
  }
}

/**
 * Lift `el` clear above `limit_bottom` (a viewport Y, e.g. a fixed footer's top
 * edge) by scrolling `scroller` up just enough. No-op when `el` already sits
 * above the limit. Used to re-clear a selected word after the term footer grows.
 */
export function scrollClearOf(scroller: Scroller, el: HTMLElement, limit_bottom: number) {
  const overshoot = el.getBoundingClientRect().bottom - limit_bottom
  if (overshoot <= 0) return

  const { current, max } = metrics(scroller)
  const target = Math.max(0, Math.min(max, current + overshoot))

  let state = stateByScroller.get(scroller)
  if (!state) {
    state = { y: current }
    stateByScroller.set(scroller, state)
  }

  state.y = current
  gsap.killTweensOf(state)
  gsap.to(state, {
    y: target,
    duration: DURATION,
    ease: 'power3.out',
    onUpdate: () => {
      if (isWindow(scroller)) window.scrollTo(0, state.y)
      else scroller.scrollTop = state.y
    }
  })
}

/**
 * Scroll `scroller` so `el` rests ~40% down the viewport, clamped to the
 * scrollable range. Used to follow the active transcript line as audio plays.
 * `scroller` is the transcript column on desktop and the window on mobile.
 * ScrollToPlugin isn't registered, so we tween a proxy and write the scroll
 * offset in onUpdate.
 *
 * Pass `animate = false` to jump instantly. A rAF-driven `window.scrollTo` tween
 * starves rAF on iOS Safari (it suspends rAF mid programmatic scroll), so the
 * paused-state repositioning — a resume seek, a scrub, a skip — must jump rather
 * than tween, or the audio tick and page lock up the moment playback starts.
 */
export function scrollLineIntoView(scroller: Scroller, el: HTMLElement, animate = true) {
  const el_rect = el.getBoundingClientRect()
  const { current, viewport, max, top } = metrics(scroller)

  const el_top_within = el_rect.top - top + current
  const desired = el_top_within - viewport * ANCHOR_RATIO + el_rect.height / 2
  const target = Math.max(0, Math.min(max, desired))

  let state = stateByScroller.get(scroller)
  if (!state) {
    state = { y: current }
    stateByScroller.set(scroller, state)
  }

  state.y = current
  gsap.killTweensOf(state)

  if (!animate) {
    state.y = target
    if (isWindow(scroller)) window.scrollTo(0, target)
    else scroller.scrollTop = target
    return
  }

  gsap.to(state, {
    y: target,
    duration: DURATION,
    ease: 'power3.out',
    onUpdate: () => {
      if (isWindow(scroller)) window.scrollTo(0, state.y)
      else scroller.scrollTop = state.y
    }
  })
}

/**
 * Scroll `scroller` only when `el` has drifted outside the deadzone band
 * (15%–80% of the viewport). When outside, snaps it to the top of the band.
 * No-ops when the word is already visible inside the band, so mid-sentence
 * words don't cause jitter. Same iOS Safari rules as `scrollLineIntoView`.
 */
export function scrollWordIntoDeadzone(scroller: Scroller, el: HTMLElement, animate = true) {
  const el_rect = el.getBoundingClientRect()
  const { current, viewport, max, top } = metrics(scroller)

  const el_top_in_vp = el_rect.top - top
  const el_bottom_in_vp = el_rect.bottom - top
  const dz_top = viewport * DEADZONE_TOP
  const dz_bottom = viewport * DEADZONE_BOTTOM

  if (el_top_in_vp >= dz_top && el_bottom_in_vp <= dz_bottom) return

  const el_top_within = el_rect.top - top + current
  const target = Math.max(0, Math.min(max, el_top_within - dz_top))

  let state = stateByScroller.get(scroller)
  if (!state) {
    state = { y: current }
    stateByScroller.set(scroller, state)
  }

  state.y = current
  gsap.killTweensOf(state)

  if (!animate) {
    state.y = target
    if (isWindow(scroller)) window.scrollTo(0, target)
    else scroller.scrollTop = target
    return
  }

  gsap.to(state, {
    y: target,
    duration: DURATION,
    ease: 'power3.out',
    onUpdate: () => {
      if (isWindow(scroller)) window.scrollTo(0, state.y)
      else scroller.scrollTop = state.y
    }
  })
}
