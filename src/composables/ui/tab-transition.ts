import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { tabSlideEnter, tabSlideLeave } from '@/utils/animations/tab-slide'
import type { SheetChrome } from './sheet-chrome'
import type { TabModalLayout } from './tab-modal-layout'

type TabTransitionOptions = {
  chrome?: SheetChrome
  // True when the tab now displayed wants the full content area. Read lazily
  // during leave, by which point the incoming tab is already the displayed one.
  is_full_bleed?: () => boolean
}

export function useTabTransition(
  layout_mode: ComputedRef<TabModalLayout>,
  tab_outlet: Ref<HTMLElement | undefined>,
  { chrome, is_full_bleed }: TabTransitionOptions = {}
) {
  const nav_direction = ref<'forward' | 'back'>('forward')

  async function onTabLeave(el: Element, done: () => void) {
    await runLeave(el)

    // Tucking waits for the outgoing tab so the chrome doesn't animate over a
    // pane that's still fading; untucking rides along with the incoming tab
    // below, since there's nothing left to collide with.
    if (is_full_bleed?.()) await chrome?.tuck()
    done()
  }

  function onTabEnter(el: Element, done: () => void) {
    if (is_full_bleed && !is_full_bleed()) chrome?.restore()
    runEnter(el, done)
  }

  function runLeave(el: Element) {
    return new Promise<void>((resolve) => {
      if (layout_mode.value === 'sheet') tabSlideLeave(nav_direction, tab_outlet.value)(el, resolve)
      else fadeLeave(el, resolve)
    })
  }

  function runEnter(el: Element, done: () => void) {
    if (layout_mode.value === 'sheet') {
      tabSlideEnter(nav_direction, tab_outlet.value)(el, done)
      return
    }
    fadeEnter(el, done)
  }

  return { nav_direction, onTabEnter, onTabLeave }
}
