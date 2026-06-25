import { gsap } from 'gsap'

const DURATION = 0.24

/**
 * Crossfade + height-resize between two arbitrary-height blocks, for a
 * `<Transition :css="false">` whose single child swaps. The outgoing child is
 * pinned absolute so the two overlap (crossfade), while the wrapper tweens from
 * the old child's height to the new one's (smooth resize).
 *
 * Wire all three to one `<Transition>`; the wrapper must be `relative` +
 * `overflow-hidden` so the pinned child overlaps and the height tween clips.
 */

/** Hide the incoming child, pin the outgoing one, and lock the wrapper to the
 *  outgoing height so `enter` has a stable height to tween from. */
export function crossfadeResizeBeforeEnter(el: Element) {
  const node = el as HTMLElement
  const wrapper = node.parentElement
  const leaving = wrapper
    ? (Array.from(wrapper.children).find((child) => child !== node) as HTMLElement | undefined)
    : undefined

  const from = leaving?.offsetHeight ?? wrapper?.offsetHeight ?? 0

  gsap.set(node, { opacity: 0 })

  // Pin the outgoing child now (not just in `leave`) so it leaves the flow the
  // instant the incoming child mounts — no single-frame vertical stacking.
  if (leaving) {
    leaving.style.position = 'absolute'
    leaving.style.inset = '0'
  }

  if (wrapper) wrapper.style.height = `${from}px`
}

/** Fade the incoming child in while the wrapper resizes to its height. */
export function crossfadeResizeEnter(el: Element, done: () => void) {
  const node = el as HTMLElement
  const wrapper = node.parentElement as HTMLElement | null

  gsap.to(node, { opacity: 1, duration: DURATION, ease: 'power1.out', clearProps: 'opacity' })

  if (!wrapper) return done()

  gsap.to(wrapper, {
    height: node.offsetHeight,
    duration: DURATION,
    ease: 'power2.inOut',
    onComplete: () => {
      wrapper.style.height = ''
      done()
    }
  })
}

/** Fade the outgoing child out; it's already pinned absolute by `beforeEnter`. */
export function crossfadeResizeLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  node.style.position = 'absolute'
  node.style.inset = '0'

  gsap.to(node, { opacity: 0, duration: DURATION, ease: 'power1.out', onComplete: done })
}
