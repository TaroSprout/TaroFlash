import { gsap } from 'gsap'

// Where the active line rests in the scroll viewport (0 = top, 1 = bottom). A
// little above centre keeps the upcoming lines visible while never letting the
// current line jam against the top or bottom edge.
const ANCHOR_RATIO = 0.4
const DURATION = 0.6

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
 * Smoothly scroll `scroller` so `el` rests ~40% down the viewport, clamped to
 * the scrollable range. Used to follow the active transcript line as audio plays.
 * `scroller` is the transcript column on desktop and the window on mobile.
 * ScrollToPlugin isn't registered, so we tween a proxy and write the scroll
 * offset in onUpdate.
 */
export function scrollLineIntoView(scroller: Scroller, el: HTMLElement) {
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
