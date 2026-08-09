import { gsap } from 'gsap'

const ENTER_DURATION = 0.15
const ENTER_DELAY = 0.15
const LEAVE_DURATION = 0.1

/**
 * Pops the summary in over the finished flashcard pane.
 *
 * No height to animate — the session window is a fixed size and both panes
 * fill it.
 */
export function sessionPaneLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, duration: LEAVE_DURATION, onComplete: done })
}

type SessionPaneEnterOptions = {
  // No delay — this is for panes the member can go back from, like settings,
  // where a beat of blank reads as a stutter rather than a flourish.
  instant?: boolean
  onStart?: () => void
}

export function sessionPaneEnter(
  el: Element,
  done: () => void,
  { instant = false, onStart }: SessionPaneEnterOptions = {}
) {
  gsap.fromTo(
    el,
    { scale: 0.9, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: ENTER_DURATION,
      delay: instant ? 0 : ENTER_DELAY,
      ease: 'back.out(1.6)',
      clearProps: 'transform',
      onStart,
      onComplete: done
    }
  )
}
