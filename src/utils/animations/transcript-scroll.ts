import { gsap } from 'gsap'

// Where the active line rests in the scroll viewport (0 = top, 1 = bottom). A
// little above centre keeps the upcoming lines visible while never letting the
// current line jam against the top or bottom edge.
const ANCHOR_RATIO = 0.4
const DURATION = 0.6

// Per-container scroll state so a new call retargets the live tween (and animates
// from the real current scrollTop) instead of fighting a stale one.
const stateByEl = new WeakMap<HTMLElement, { y: number }>()

/**
 * Smoothly scroll `container` so `el` rests ~40% down the viewport, clamped to
 * the scrollable range. Used to follow the active transcript line as audio plays.
 * ScrollToPlugin isn't registered, so we tween a proxy and write scrollTop in
 * onUpdate.
 */
export function scrollLineIntoView(container: HTMLElement, el: HTMLElement) {
  const container_rect = container.getBoundingClientRect()
  const el_rect = el.getBoundingClientRect()

  const el_top_within = el_rect.top - container_rect.top + container.scrollTop
  const desired = el_top_within - container.clientHeight * ANCHOR_RATIO + el_rect.height / 2
  const max_scroll = container.scrollHeight - container.clientHeight
  const target = Math.max(0, Math.min(max_scroll, desired))

  let state = stateByEl.get(container)
  if (!state) {
    state = { y: container.scrollTop }
    stateByEl.set(container, state)
  }

  state.y = container.scrollTop
  gsap.killTweensOf(state)
  gsap.to(state, {
    y: target,
    duration: DURATION,
    ease: 'power3.out',
    onUpdate: () => {
      container.scrollTop = state.y
    }
  })
}
