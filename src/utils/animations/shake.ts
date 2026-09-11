import { motion } from '@/utils/motion/driver'
import { useMotionStore } from '@/stores/motion'

const SHAKE_DISTANCE = 6
const SHAKE_STEP_DURATION = 0.08

/**
 * Rattles an element side to side, e.g. to flag a repeat failure. Runs on the
 * motion driver and stays still when the OS asks for reduced motion or the
 * device is on the minimal tier, where a rattle would be unwelcome noise.
 */
export function shake(el: HTMLElement): Promise<void> {
  const store = useMotionStore()
  if (store.prefers_reduced_motion || store.tier === 'minimal') return Promise.resolve()

  const handle = motion(
    (target, ctx) => {
      ctx.tl
        .to(target, { x: -SHAKE_DISTANCE, duration: SHAKE_STEP_DURATION })
        .to(target, { x: SHAKE_DISTANCE, duration: SHAKE_STEP_DURATION })
        .to(target, { x: -SHAKE_DISTANCE, duration: SHAKE_STEP_DURATION })
        .to(target, { x: 0, duration: SHAKE_STEP_DURATION })
    },
    { clearOnComplete: true }
  )(el)

  return handle.done
}
