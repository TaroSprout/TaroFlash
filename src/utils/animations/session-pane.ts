import { motion } from '@/utils/motion/driver'
import { pinOutOfFlow } from './pin-out-of-flow'
import type { Motion } from '@/utils/motion/types'

const ENTER_DURATION = 0.15
const ENTER_DELAY = 0.15
const LEAVE_DURATION = 0.1
const ENTER_EASE = 'back.out(1.6)'

type SessionPaneEnterOptions = {
  // No delay — this is for panes the member can go back from, like settings,
  // where a beat of blank reads as a stutter rather than a flourish.
  instant?: boolean
  onStart?: () => void
}

/** Pops the summary in over the finished flashcard pane. */
export function sessionPaneEnter({
  instant = false,
  onStart
}: SessionPaneEnterOptions = {}): Motion {
  return motion(
    (el, ctx) => {
      ctx.tl.fromTo(
        el,
        { scale: 0.9, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: ENTER_DURATION,
          delay: instant ? 0 : ENTER_DELAY,
          ease: ENTER_EASE,
          onStart
        }
      )
    },
    { clearOnComplete: true }
  )
}

/**
 * Fades the finished flashcard pane out from under the summary.
 *
 * Locks its measured height in pixels first: a header or footer row that changes
 * shape mid-swap would otherwise re-resolve `h-full` against the new layout and
 * shove the pane while it's still fading.
 */
export const sessionPaneLeave: Motion = motion((el, ctx) => {
  pinOutOfFlow(el, { lockHeight: true })
  ctx.tl.to(el, { opacity: 0, duration: LEAVE_DURATION })
})
