import { ref, type ComputedRef, type Ref } from 'vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'
import type { WindowLayout } from './layout'

type PageTransitionOptions = {
  // Runs in the empty gap between the leaving and entering page — the one frame
  // with no page mounted, so any reflow it triggers can't shift live content.
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
  outlet: Ref<HTMLElement | undefined>,
  { between }: PageTransitionOptions = {}
) {
  const nav_direction = ref<'forward' | 'back'>('forward')

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
        tabSlideLeave(nav_direction, outlet.value)(el, resolve)
        return
      }
      fadeLeave(el, resolve)
    })
  }

  function runEnter(el: Element, done: () => void) {
    if (layout_mode.value === 'phone') {
      tabSlideEnter(nav_direction, outlet.value)(el, done)
      return
    }
    fadeEnter(el, done)
  }

  return { nav_direction, onPageEnter, onPageLeave }
}
