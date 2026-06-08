import { gsap } from 'gsap'

const DURATION = 0.5
const SCALE = 0.95

// One screen of travel. The overlay (editor/importer) is a full page-flow
// pane far taller than the viewport, so sliding by its own height would push
// it mostly off-screen for the whole tween; a viewport-relative distance keeps
// the slide visible regardless of content height.
function viewportDistance() {
  return window.innerHeight
}

/* ── Grid pane: scales down + fades ───────────────────────────────────────── */

// Anchor the scale to the top edge so it shrinks/grows downward only — a
// centre origin drifts the top edge and reads as a vertical slide.
const ORIGIN = 'top center'

// Entering grid stays in flow (it defines the settled height) and fades up
// from a slightly shrunk state.
export function fadeScaleEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, scale: SCALE, transformOrigin: ORIGIN },
    { opacity: 1, scale: 1, duration: DURATION, ease: 'expo.out', onComplete: done }
  )
}

// Leaving grid drops out of flow (so the entering pane owns the height) and
// shrinks + fades in place.
export function fadeScaleLeave(el: Element, done: () => void) {
  gsap.set(el, { position: 'absolute', top: 0, left: 0, width: '100%' })
  gsap.to(el, {
    opacity: 0,
    scale: SCALE,
    transformOrigin: ORIGIN,
    duration: DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}

/* ── Overlay pane (editor / importer): slides up + down ───────────────────── */

// Entering overlay stays in flow but starts one screen below its slot, layered
// above the grid, and rises into place.
export function primeOverlayBelow(el: Element) {
  gsap.set(el, { position: 'relative', zIndex: 1, y: viewportDistance() })
}

export function slideOverlayUp(el: Element, done: () => void) {
  gsap.to(el, {
    y: 0,
    duration: DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}

// Drop the entered overlay's inline overrides so it settles as a plain in-flow
// block and the page — not the pane — owns the scroll.
export function settleOverlay(el: Element) {
  gsap.set(el, { clearProps: 'position,zIndex,transform' })
}

// Leaving overlay drops out of flow (so the entering grid owns the height) and
// slides one screen down, still layered on top.
export function slideOverlayDown(el: Element, done: () => void) {
  gsap.set(el, { position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 1 })
  gsap.to(el, {
    y: viewportDistance(),
    duration: DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}
