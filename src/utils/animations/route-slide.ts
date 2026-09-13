import { motion } from '@/utils/motion/driver'
import { motionTransition } from '@/utils/motion/transition'
import { pinOutOfFlow } from './pin-out-of-flow'
import type { Ref } from 'vue'

const DURATION = 200
const EASE = 'in-out'

type RouteSlideOptions = {
  /** True when the destination is the dashboard — reverses the slide so backing out reads as going back. */
  going_to_dashboard: Ref<boolean>
  /** True until the first navigation settles, so a cold load paints without sliding. */
  is_initial: Ref<boolean>
  /** Flipped true once the enter has played (or was skipped), gating the skeleton overlay. */
  animation_done: Ref<boolean>
}

/**
 * The directional slide between full route changes: the leaving page pins out of
 * flow and slides off while the entering page slides in behind it.
 *
 * Returns the enter/leave hooks a `<Transition :css="false">` expects. Build it
 * once per shell mount so its enter/leave share one scope — the `leave_pending`
 * flag below lives there, not at module level.
 */
export function routeSlide({ going_to_dashboard, is_initial, animation_done }: RouteSlideOptions) {
  // Leave and enter are always paired on a real navigation; a Suspense resolve
  // triggers enter with no corresponding leave. This flag lets enter skip its
  // slide when no leave preceded it. It lives in this per-shell closure and
  // resets on every played enter, so an interrupted navigation can't latch it
  // the way the old module-level flag did — the next page always slides.
  let leave_pending = false

  const enterMotion = motion(
    (el, ctx) => {
      const from = going_to_dashboard.value ? -100 : 100
      ctx.tl.fromTo(
        el,
        { xPercent: from },
        { xPercent: 0, duration: ctx.duration(DURATION), ease: ctx.ease(EASE) }
      )
    },
    { clearOnComplete: true }
  )

  const leaveMotion = motion((el, ctx) => {
    pinOutOfFlow(el)
    const to = going_to_dashboard.value ? 100 : -100
    ctx.tl.to(el, { xPercent: to, duration: ctx.duration(DURATION), ease: ctx.ease(EASE) })
  })

  const { onEnter, onLeave } = motionTransition(enterMotion, leaveMotion)

  function routeSlideLeave(el: Element, done: () => void) {
    leave_pending = true
    onLeave(el, done)
  }

  function routeSlideEnter(el: Element, done: () => void) {
    if (is_initial.value || !leave_pending) {
      animation_done.value = true
      done()
      return
    }
    leave_pending = false
    onEnter(el, () => {
      animation_done.value = true
      done()
    })
  }

  return { onLeave: routeSlideLeave, onEnter: routeSlideEnter }
}
