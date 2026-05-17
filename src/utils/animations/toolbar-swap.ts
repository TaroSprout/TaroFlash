import { gsap } from 'gsap'

const DURATION = 0.2
const OFFSET = 12

/** Toolbar swap — incoming variant slides up from below + fades in. */
export function toolbarEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: OFFSET },
    {
      opacity: 1,
      y: 0,
      duration: DURATION,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
      onComplete: done
    }
  )
}

/**
 * Toolbar swap — leaving variant slides up + fades out. Pins the node
 * absolute mid-leave so the entering variant can claim its layout slot
 * without a vertical jump.
 */
export function toolbarLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  node.style.position = 'absolute'
  node.style.inset = '0'
  gsap.to(el, {
    opacity: 0,
    y: -OFFSET,
    duration: DURATION,
    ease: 'power2.out',
    onComplete: done
  })
}
