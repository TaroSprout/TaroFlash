import { gsap } from 'gsap'

const ENTER_DURATION = 0.15
const ENTER_DELAY = 0.15
const LEAVE_DURATION = 0.1

/**
 * Transition between the study-session phases (flashcard → summary). The
 * outgoing flashcard pane is already empty by the time the session completes
 * (the last card swiped out), so the summary simply pops in on top: the
 * leaving pane fades while the entering pane scales up and fades in.
 *
 * The modal is a fixed size and both panes fill it (`h-full`), so there's no
 * height to animate — just opacity and a scale.
 */
export function sessionPaneLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, duration: LEAVE_DURATION, onComplete: done })
}

type SessionPaneEnterOptions = {
  // Skip the pre-enter delay so the incoming pane appears immediately, for
  // reversible in-session navigation (settings) rather than the terminal
  // summary pop.
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
