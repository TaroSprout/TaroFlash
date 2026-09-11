import { defineMotion, motion } from '@/utils/motion/driver'
import { motionTransition } from '@/utils/motion/transition'
import { pinOutOfFlow } from './pin-out-of-flow'

const toolbarEnterMotion = defineMotion({
  from: { opacity: 0 },
  to: { opacity: 1 },
  duration: 200,
  ease: 'out',
  clearOnComplete: true
})

// Pins the leaving variant out of flow so the incoming one can claim its layout
// slot without a jump, then crossfades it out.
const toolbarLeaveMotion = motion((el, ctx) => {
  pinOutOfFlow(el)
  ctx.tl.to(el, { opacity: 0, duration: ctx.duration(200), ease: ctx.ease('out') })
})

/** Crossfades one toolbar variant out as its replacement fades in. */
export const toolbarSwap = motionTransition(toolbarEnterMotion, toolbarLeaveMotion)
