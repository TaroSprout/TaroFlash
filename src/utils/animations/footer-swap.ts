import { gsap } from 'gsap'

const HEIGHT_DURATION = 0.2
const FADE_DURATION = 0.15

// Pin a pane on top of its sibling so the two can crossfade in the same slot
// without either dictating the wrapper's layout height.
function pin(node: HTMLElement) {
  node.style.position = 'absolute'
  node.style.left = '0'
  node.style.right = '0'
  node.style.top = '0'
}

function unpin(node: HTMLElement) {
  node.style.position = ''
  node.style.left = ''
  node.style.right = ''
  node.style.top = ''
}

/**
 * Crossfade two footer panes (audio toolbar ⇄ term card) while smoothly
 * animating the footer's height between their two sizes.
 *
 * Wire all three hooks on a single-child `<Transition>` (no `mode` — leave and
 * enter overlap) whose direct parent is `wrapper`. The wrapper must be
 * `relative` so the pinned panes stack. Because the footer is anchored at the
 * bottom of the viewport, growing the wrapper pushes its top edge upward.
 *
 * Overflow is clipped only for the duration of the tween — at rest the wrapper
 * lets content (e.g. the scrubber thumb that sits proud of its track) bleed past
 * its edges.
 *
 * Flow:
 * - before-leave: freeze the wrapper at its current height so it can't collapse
 *   when both panes pin absolute, and clip overflow for the tween.
 * - leave: pin the outgoing pane and fade it out.
 * - enter: pin the incoming pane, tween the wrapper to its natural height, fade
 *   it in, then release the wrapper back to `auto` and unclip.
 */
export function footerSwapBeforeLeave(wrapper: HTMLElement) {
  return () => {
    wrapper.style.height = `${wrapper.offsetHeight}px`
    wrapper.style.overflow = 'hidden'
  }
}

export function footerSwapLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  pin(node)
  gsap.to(node, { opacity: 0, duration: FADE_DURATION, ease: 'power1.out', onComplete: done })
}

export function footerSwapEnter(wrapper: HTMLElement) {
  return (el: Element, done: () => void) => {
    const node = el as HTMLElement
    pin(node)
    const target = node.scrollHeight

    gsap.set(node, { opacity: 0 })
    // `done` fires from the height tween (the longer of the two) so the swap isn't
    // reported complete until the wrapper is released back to `auto` and unpinned —
    // any content-driven height animation waits for that before taking over.
    gsap.to(wrapper, {
      height: target,
      duration: HEIGHT_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        wrapper.style.height = ''
        wrapper.style.overflow = ''
        unpin(node)
        done()
      }
    })
    gsap.to(node, { opacity: 1, duration: FADE_DURATION, ease: 'power1.out' })
  }
}
