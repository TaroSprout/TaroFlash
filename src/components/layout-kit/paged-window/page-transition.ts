import { ref, type ComputedRef, type Ref } from 'vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'
import { motionTransition } from '@/utils/motion/transition'
import { useStageHeight } from '@/components/layout-kit/stage/use-stage-height'
import type { WindowLayout } from './layout'

type PageTransitionOptions = {
  /** Runs in the empty gap between the leaving and entering page — the one frame with no page mounted, so any reflow it triggers can't shift live content. */
  between?: () => void | Promise<void>
}

/**
 * Drives the between-pages Transition for paged-window: a directional slide on
 * `phone`, a plain crossfade on tablet/desktop. Set the returned
 * `nav_direction` before changing the displayed page so the leave that follows
 * animates the right way.
 *
 * @param outlet - the scroll container whose height animates on phone
 */
export function usePageTransition(
  layout_mode: ComputedRef<WindowLayout>,
  outlet: Ref<HTMLElement | null>,
  { between }: PageTransitionOptions = {}
) {
  const nav_direction = ref<'forward' | 'back'>('forward')

  // No content is ever observed here — the slide drives the outlet's height itself,
  // imperatively, so the stage's own resize-tracking never runs alongside it.
  const { driveHeight } = useStageHeight(outlet, ref<HTMLElement | null>(null))

  // The phone slide runs through the shared driver; the direction and outlet
  // refs are read when each motion is invoked, so one instance covers every swap.
  const slide = motionTransition(
    tabSlideEnter(nav_direction, outlet, driveHeight),
    tabSlideLeave(nav_direction, outlet)
  )

  async function onPageLeave(el: Element, done: () => void) {
    await runLeave(el)

    await between?.()
    done()
  }

  function onPageEnter(el: Element, done: () => void) {
    runEnter(el, done)
  }

  function runLeave(el: Element) {
    return new Promise<void>((resolve) => {
      if (layout_mode.value === 'phone') {
        slide.onLeave(el, resolve)
        return
      }
      fadeLeave(el, resolve)
    })
  }

  function runEnter(el: Element, done: () => void) {
    if (layout_mode.value === 'phone') {
      slide.onEnter(el, done)
      return
    }
    fadeEnter(el, done)
  }

  return { nav_direction, onPageEnter, onPageLeave }
}
