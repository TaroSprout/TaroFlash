import { motion } from '@/utils/motion/driver'
import type { MotionHandle } from '@/utils/motion/types'

export const BUTTON_TAP_DURATION = 0.1

type PopOptions = {
  /** Animate back to neutral after peaking. Total runtime stays `duration`. */
  yoyo?: boolean
  /** Seconds held at peak before the yoyo return. Yoyo-only. */
  hold?: number
  duration?: number
}

/**
 * Scale/rotate "pop" on a tapped control, run on the motion driver.
 *
 * The returned handle exposes a `peak` mark that resolves at the high point and
 * a `done` that resolves when it lands. Both settle if the driver cancels the
 * motion mid-flight, so a control unmounted mid-tap never latches its handle.
 */
export function playButtonTap(el: HTMLElement, options: PopOptions = {}): MotionHandle {
  const { yoyo = false, hold = 0.1, duration = BUTTON_TAP_DURATION } = options

  return motion(
    (target, ctx) => {
      if (!yoyo) {
        ctx.tl.to(target, { scale: 1.2, rotate: 3, duration, ease: 'expo.out' })
        ctx.mark('peak')
        return
      }

      const step = duration * 0.5
      ctx.tl.to(target, { scale: 1.3, rotate: 3, duration: step, ease: 'back.out' })
      ctx.mark('peak', step + hold)
      ctx.tl.to(target, { scale: 1, rotate: 0, duration: step, ease: 'back.out(3)' }, `+=${hold}`)
    },
    { clearOnComplete: true }
  )(el)
}

/**
 * Finite hold that backs the quiet tap: no transform of its own, it just runs
 * for `duration` and settles. The action fires on this real completion instead
 * of a wall-clock timer, and a mid-tap unmount settles it via the driver.
 */
export function playButtonSweep(el: HTMLElement, duration = BUTTON_TAP_DURATION): MotionHandle {
  return motion((target, ctx) => ctx.tl.to(target, { duration }), { promote: false })(el)
}
