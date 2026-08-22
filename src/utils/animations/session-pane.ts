import { gsap } from 'gsap'

const ENTER_DURATION = 0.15
const ENTER_DELAY = 0.15
const LEAVE_DURATION = 0.1

/**
 * Pops the summary in over the finished flashcard pane.
 *
 * Pins the leaving pane out of flow at its measured height before fading, so
 * a header or footer row that changes shape mid-swap can't shove it while
 * it's still fading out. `inset: 0` and a `h-full` class both re-resolve
 * against the resized layout on every frame, so the height is read once, up
 * front, in pixels, and written as an explicit style instead.
 */
export function sessionPaneLeave(el: Element, done: () => void) {
  const node = el as HTMLElement
  const { height } = node.getBoundingClientRect()

  node.style.position = 'absolute'
  node.style.top = '0'
  node.style.left = '0'
  node.style.width = '100%'
  node.style.height = `${height}px`

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
