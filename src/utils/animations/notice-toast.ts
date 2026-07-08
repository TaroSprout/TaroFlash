import { gsap } from 'gsap'
import { scaleFadeOut } from './modal'

/**
 * Leave handler for a toast living inside a TransitionGroup list: freezes the
 * card at its current position (out of flow) so the remaining toasts can FLIP
 * into the gap immediately, then plays the shared scale-out.
 */
export function noticeToastListLeave(el: Element, done: () => void) {
  const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = el as HTMLElement

  gsap.set(el, {
    position: 'absolute',
    top: offsetTop,
    left: offsetLeft,
    width: offsetWidth,
    height: offsetHeight
  })

  scaleFadeOut(el, done)
}
