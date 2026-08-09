import { gsap } from 'gsap'

const DURATION = 0.5
const SCALE = 0.95

// The page scroll jumps the instant the mode switches. Every hook below offsets
// its pane by that jump, so nothing appears to move until the tweens run.
export type ModeSwitchViewport = {
  from_y: number
  settle_y: number
  stack_top: number
}

// Call before the DOM patches — afterwards the measurements describe the new
// mode rather than what the user is still looking at.
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

// The shift that keeps an out-of-flow pane visually still across the jump.
function scrollCompensation(vp: ModeSwitchViewport) {
  return vp.settle_y - vp.from_y
}

// Also the stack's minimum height during the switch — the clip box has to reach
// the bottom of the screen, or a short incoming grid crops the outgoing pane.
export function distanceToViewportBottom(vp: ModeSwitchViewport) {
  return Math.max(0, vp.settle_y + window.innerHeight - vp.stack_top)
}

// Keep the scale anchored to the top edge — from the centre, the top drifts and
// the whole thing reads as a vertical slide.
const ORIGIN = 'top center'

// The grid is only hidden, never unmounted, so clear what a previous leave left
// on it — it has to rejoin the flow to define the page height again.
export function fadeScaleEnter(el: Element, done: () => void) {
  gsap.set(el, { clearProps: 'position,top,left,width,transform,overflow' })
  gsap.fromTo(
    el,
    { opacity: 0, scale: SCALE, transformOrigin: ORIGIN },
    { opacity: 1, scale: 1, duration: DURATION, ease: 'expo.out', onComplete: done }
  )
}

// Keep the overflow clip — while absolute, the grid resolves its height against
// the stack and would otherwise flash a scrollbar and shift its content.
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

// Starts the editor with its top at the bottom of the screen, above the grid,
// ready to rise into place.
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

// Call once the rise finishes, or the page never takes the scroll back off the
// pane.
export function settleOverlay(el: Element) {
  gsap.set(el, { clearProps: 'position,zIndex,transform' })
}

// Call when a mode flip interrupts a slide, so a late completion can't fire and
// stale inline styles can't linger on a reused element.
export function cancelOverlayAnimation(el: Element) {
  gsap.killTweensOf(el)
}

// Fades when the user had scrolled into the pane — from there, one screen of
// travel can't clear the bottom edge, and it would vanish mid-screen.
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
