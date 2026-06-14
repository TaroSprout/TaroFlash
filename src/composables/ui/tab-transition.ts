import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'
import type { TabModalLayout } from './tab-modal-layout'

export function useTabTransition(
  layout_mode: ComputedRef<TabModalLayout>,
  tab_outlet: Ref<HTMLElement | undefined>
) {
  const nav_direction = ref<'forward' | 'back'>('forward')
  const tab_initial_render = ref(true)

  function onTabLeave(el: Element, done: () => void) {
    if (layout_mode.value === 'sheet') {
      tabSlideLeave(nav_direction, tab_outlet.value)(el, done)
      return
    }
    fadeLeave(el, done)
  }

  function onTabEnter(el: Element, done: () => void) {
    if (tab_initial_render.value) {
      tab_initial_render.value = false
      done()
      return
    }
    if (layout_mode.value === 'sheet') {
      tabSlideEnter(nav_direction, tab_outlet.value)(el, done)
      return
    }
    fadeEnter(el, done)
  }

  return { nav_direction, onTabEnter, onTabLeave }
}
