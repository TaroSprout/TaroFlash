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
 * Crossfade two arbitrary-height panes in the same slot while smoothly animating
 * their shared wrapper's height between the two sizes. Backs the layout-kit
 * `<crossfade-resize>` component; used for footer pane swaps (deck editor ⇄
 * actions, audio toolbar ⇄ term card).
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
 * - enter: pin the incoming pane, resize the wrapper to its natural height
 *   (snapped by default, tweened when `animate_height` is set — see below),
 *   fade it in, then release the wrapper back to `auto` and unclip.
 */
export function crossfadeResizeBeforeLeave(wrapper: HTMLElement) {
  return () => {
    wrapper.style.height = `${wrapper.offsetHeight}px`
    wrapper.style.overflow = 'hidden'
  }
}

export function crossfadeResizeLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  pin(node)
  gsap.to(node, { opacity: 0, duration: FADE_DURATION, ease: 'power1.out', onComplete: done })
}

// Panes with a lot of DOM (a long transcript) took 12+ forced layouts over
// 200ms when `height` was tweened — snapping it in one frame (the default)
// dodges that, with the opacity fade below covering the snap visually. Small,
// cheap panes can afford the real tween instead via `animate_height`.
export function crossfadeResizeEnter(wrapper: HTMLElement, animate_height = false) {
  return (el: Element, done: () => void) => {
    const node = el as HTMLElement
    pin(node)
    const target = node.scrollHeight

    function cleanup() {
      wrapper.style.height = ''
      wrapper.style.overflow = ''
      unpin(node)
      done()
    }

    gsap.set(node, { opacity: 0 })

    if (!animate_height) {
      gsap.set(wrapper, { height: target })
      gsap.to(node, {
        opacity: 1,
        duration: FADE_DURATION,
        ease: 'power1.out',
        onComplete: cleanup
      })
      return
    }

    // Tie both tweens to one timeline so cleanup (which releases the wrapper
    // back to `auto` height) waits for whichever runs longer.
    gsap
      .timeline({ onComplete: cleanup })
      .to(wrapper, { height: target, duration: HEIGHT_DURATION, ease: 'power2.out' }, 0)
      .to(node, { opacity: 1, duration: FADE_DURATION, ease: 'power1.out' }, 0)
  }
}
