import { gsap } from 'gsap'

const DURATION = 0.5
const SCALE = 0.95

/* ── Viewport context ──────────────────────────────────────────────────────── */

// A mode switch animates in viewport space: the window scroll jumps to
// `settle_y` (where the incoming pane rests) at the moment of the switch, and
// every hook offsets its pane so nothing appears to move until the tweens run.
export type ModeSwitchViewport = {
  from_y: number
  settle_y: number
  stack_top: number
}

// Must run before the DOM patches — rects and scroll still describe the
// outgoing mode, i.e. what the user is actually looking at. `settle_y` keeps
// the user's scroll when they're above the stack, otherwise lands the incoming
// pane's top just below the sticky header.
export function captureModeSwitch(
  stack: HTMLElement,
  sticky_header?: HTMLElement | null
): ModeSwitchViewport {
  const from_y = window.scrollY
  const stack_top = stack.getBoundingClientRect().top + from_y
  const header_bottom = sticky_header?.getBoundingClientRect().bottom ?? 0

  const settle_y = Math.min(from_y, Math.max(0, stack_top - header_bottom))
  return { from_y, settle_y, stack_top }
}

// The shift that keeps an out-of-flow pane visually still across the
// settle-scroll jump.
function scrollCompensation(vp: ModeSwitchViewport) {
  return vp.settle_y - vp.from_y
}

// Distance from the stack's top to the viewport's bottom edge once settled.
// Doubles as the overlay's slide-in offset and as the stack's min-height
// during the switch — the clip box must reach the screen bottom or a short
// incoming grid clips the outgoing pane to its own height.
export function distanceToViewportBottom(vp: ModeSwitchViewport) {
  return Math.max(0, vp.settle_y + window.innerHeight - vp.stack_top)
}

/* ── Grid pane: scales down + fades ───────────────────────────────────────── */

// Anchor the scale to the top edge so it shrinks/grows downward only — a
// centre origin drifts the top edge and reads as a vertical slide.
const ORIGIN = 'top center'

// Entering grid stays in flow (it defines the settled height) and fades up
// from a slightly shrunk state. The grid is kept mounted via v-show, so clear
// the absolute positioning and compensation a prior leave left behind — it
// must rejoin flow to define the page height again.
export function fadeScaleEnter(el: Element, done: () => void) {
  gsap.set(el, { clearProps: 'position,top,left,width,transform,overflow' })
  gsap.fromTo(
    el,
    { opacity: 0, scale: SCALE, transformOrigin: ORIGIN },
    { opacity: 1, scale: 1, duration: DURATION, ease: 'expo.out', onComplete: done }
  )
}

// Leaving grid drops out of flow (so the entering pane owns the height) and
// shrinks + fades in place — compensated so the rows under the user's eyes
// stay put through the scroll jump. Clip overflow while absolute: the grid's
// `h-full` resolves against the stack's clip min-height, so its own
// `overflow-y-auto` would otherwise flash a scrollbar and shift the content.
export function fadeScaleLeave(el: Element, vp: ModeSwitchViewport, done: () => void) {
  gsap.set(el, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    overflow: 'hidden',
    y: scrollCompensation(vp)
  })
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

// Entering overlay stays in flow but starts with its top at the viewport's
// bottom edge, layered above the grid, and rises into place.
export function primeOverlayBelow(el: Element, vp: ModeSwitchViewport) {
  gsap.set(el, { position: 'relative', zIndex: 1, y: distanceToViewportBottom(vp) })
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

// A mode flip can interrupt an in-flight slide. Kill the tween so its late
// onComplete can't fire and its inline position/transform don't linger on a
// reused element — the caller has already dropped the pane from its in-flight
// set, this just stops GSAP from mutating it further.
export function cancelOverlayAnimation(el: Element) {
  gsap.killTweensOf(el)
}

// Leaving overlay drops out of flow (so the entering grid owns the height) and
// slides one screen down from wherever the user was looking. When the user was
// scrolled into the pane, one screen of travel can't carry its top edge past
// the viewport bottom — fade it out so it never unmounts mid-screen.
export function slideOverlayDown(el: Element, vp: ModeSwitchViewport, done: () => void) {
  const from = scrollCompensation(vp)

  gsap.set(el, { position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 1, y: from })
  gsap.to(el, {
    y: from + window.innerHeight,
    opacity: from < 0 ? 0 : 1,
    duration: DURATION,
    ease: 'expo.out',
    onComplete: done
  })
}
