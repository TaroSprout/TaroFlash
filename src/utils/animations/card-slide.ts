import { motion } from '@/utils/motion/driver'
import { pinOutOfFlow } from './pin-out-of-flow'
import type { Motion } from '@/utils/motion/types'

const DURATION = 0.25
// Keep both panes on one easing and duration — any difference and they drift
// apart instead of reading as one strip being pushed across.
const EASE = 'power2.inOut'

export type SlideDirection = 'forward' | 'back'

/**
 * Swaps a card's whole face by pushing the new one in against the old.
 *
 * Wire the motions on a single-child `<Transition :css="false">` inside a
 * `relative`, `overflow-hidden` parent. Use `back` for anything that undoes a
 * `forward` — the reversed direction is what makes cancelling read as going back
 * rather than as another step onward.
 */
export function cardSlideEnter(direction: SlideDirection): Motion {
  const from = direction === 'forward' ? 100 : -100
  return motion(
    (el, ctx) => {
      ctx.tl.fromTo(el, { xPercent: from }, { xPercent: 0, duration: DURATION, ease: EASE })
    },
    { clearOnComplete: true }
  )
}

export function cardSlideLeave(direction: SlideDirection): Motion {
  const to = direction === 'forward' ? -100 : 100
  return motion((el, ctx) => {
    pinOutOfFlow(el)
    ctx.tl.to(el, { xPercent: to, duration: DURATION, ease: EASE })
  })
}
