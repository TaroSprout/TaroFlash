import { motion } from '@/utils/motion/driver'
import type { Ref } from 'vue'
import type { Motion } from '@/utils/motion/types'
import type {
  DriveHeightOptions,
  DrivenHeightChange
} from '@/components/layout-kit/stage/use-stage-height'

const ENTER_DURATION = 200
const LEAVE_DURATION = 150
const SLIDE = 48

type Direction = Ref<'forward' | 'back'>
type Wrapper = Ref<HTMLElement | null>
type DriveHeight = (target: number, options: DriveHeightOptions) => DrivenHeightChange

/**
 * Slides a tab in or out, the way drilling into a menu and backing out of it
 * should feel on a narrow screen. Pass the same `direction` ref to both motions —
 * the enter reads the value as it was before the leave began.
 *
 * @param wrapper - Resized alongside the slide for the sheet layout, where the
 *   panel itself grows and shrinks with its content.
 */
export function tabSlideLeave(direction: Direction, wrapper: Wrapper): Motion {
  return motion((el, ctx) => {
    const box = wrapper.value
    // Freeze the panel's height so it can't collapse before the entering page resizes.
    if (box) box.style.height = `${box.offsetHeight}px`

    if (direction.value === 'back') {
      ctx.tl.to(el, {
        x: ctx.travel(SLIDE),
        opacity: 0,
        duration: ctx.duration(LEAVE_DURATION),
        ease: ctx.ease('in')
      })
      return
    }
    ctx.tl.to(el, { opacity: 0, duration: ctx.duration(LEAVE_DURATION) })
  })
}

export function tabSlideEnter(
  direction: Direction,
  wrapper: Wrapper,
  driveHeight: DriveHeight
): Motion {
  return motion(
    (el, ctx) => {
      const box = wrapper.value
      if (box) {
        const { settled } = driveHeight(el.scrollHeight, {
          duration: ctx.duration(ENTER_DURATION),
          ease: ctx.ease('out')
        })
        void settled.then(() => {
          box.style.height = ''
        })
      }

      if (direction.value === 'forward') {
        ctx.tl.fromTo(
          el,
          { x: ctx.travel(SLIDE), opacity: 0 },
          { x: 0, opacity: 1, duration: ctx.duration(ENTER_DURATION), ease: ctx.ease('out') },
          0
        )
        return
      }
      ctx.tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: ctx.duration(ENTER_DURATION) }, 0)
    },
    { clearOnComplete: true }
  )
}
