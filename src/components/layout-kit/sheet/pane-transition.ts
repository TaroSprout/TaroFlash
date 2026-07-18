import { ref, type ComputedRef, type Ref } from 'vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'
import type { SheetLayout } from './sheet-layout'

type PaneTransitionOptions = {
  // Runs in the empty gap between the leaving and entering pane — the one frame
  // with no pane mounted, so any reflow it triggers can't shift live content.
  between?: () => void | Promise<void>
}

/**
 * Drives the between-panes Transition for sheet-pager: a directional slide on
 * `phone`, a plain crossfade on tablet/desktop. Callers pass the same
 * `nav_direction` ref into their navigation so the enter hook reads the
 * direction set before the leave began.
 *
 * @param outlet - the scroll container whose height animates on phone
 */
export function usePaneTransition(
  layout_mode: ComputedRef<SheetLayout>,
  outlet: Ref<HTMLElement | undefined>,
  { between }: PaneTransitionOptions = {}
) {
  const nav_direction = ref<'forward' | 'back'>('forward')

  async function onPaneLeave(el: Element, done: () => void) {
    await runLeave(el)

    await between?.()
    done()
  }

  function onPaneEnter(el: Element, done: () => void) {
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

  return { nav_direction, onPaneEnter, onPaneLeave }
}
