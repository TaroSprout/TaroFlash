import { gsap } from 'gsap'

const DURATION = 0.2

/** Toolbar swap — incoming variant crossfades in. */
export function toolbarEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: DURATION,
      ease: 'power2.out',
      clearProps: 'opacity',
      onComplete: done
    }
  )
}

/**
 * Toolbar swap — leaving variant crossfades out. Pins the node absolute
 * mid-leave so the entering variant can claim its layout slot without a jump.
 */
export function toolbarLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  node.style.position = 'absolute'
  node.style.inset = '0'
  gsap.to(el, {
    opacity: 0,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}
