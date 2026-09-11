import { scaleFadeOut } from './modal'
import { pinOutOfFlow } from './pin-out-of-flow'

/**
 * Leave handler for a toast living inside a TransitionGroup list: freezes the
 * card at its current position (out of flow) so the remaining toasts can FLIP
 * into the gap immediately, then plays the shared scale-out.
 */
export function noticeToastListLeave(el: Element, done: () => void) {
  pinOutOfFlow(el as HTMLElement, { freeze: true })

  scaleFadeOut(el, done)
}
