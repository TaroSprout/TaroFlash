import { gsap } from 'gsap'

const HEIGHT_DURATION = 0.2
const FADE_DURATION = 0.15

// Stacks a pane on its sibling so the two can crossfade in one slot without
// either one dictating the wrapper's height.
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
 * Freezes the wrapper's height before the outgoing pane leaves.
 *
 * Wire all three hooks together, on a `<Transition>` with no `mode` so the two
 * panes overlap, inside a `relative` wrapper. Alone, this one strands the
 * wrapper at a fixed height — only the enter hook releases it.
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

/**
 * Fades the incoming pane in, resizes the wrapper, and releases everything the
 * other two hooks froze.
 *
 * @param animate_height - Tween the resize instead of snapping it. Only for
 *   small panes: a long transcript cost 12+ forced layouts over 200ms, which
 *   the default snap avoids and the fade hides.
 */
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

    // One timeline, so the release waits for whichever tween runs longer.
    gsap
      .timeline({ onComplete: cleanup })
      .to(wrapper, { height: target, duration: HEIGHT_DURATION, ease: 'power2.out' }, 0)
      .to(node, { opacity: 1, duration: FADE_DURATION, ease: 'power1.out' }, 0)
  }
}
