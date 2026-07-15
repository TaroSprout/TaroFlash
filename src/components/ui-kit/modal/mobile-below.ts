import { useMatchMedia, type BreakpointKey } from '@/composables/ui/media-query'
import type { ModalMode } from '@/composables/modal'

export const DEFAULT_MODE: ModalMode = 'dialog'
export const DEFAULT_WIDTH_KEY: BreakpointKey = 'sm'
export const DEFAULT_HEIGHT_KEY: BreakpointKey = 'sm'

/** Whether an entry's dataset-stamped mobile-below breakpoints currently match. */
export function isMobileFor(el: Element) {
  const html = el as HTMLElement
  const width_key = (html.dataset.mobileBelowWidth as BreakpointKey) ?? DEFAULT_WIDTH_KEY
  const height_key = (html.dataset.mobileBelowHeight as BreakpointKey) ?? DEFAULT_HEIGHT_KEY
  return useMatchMedia(`w<${width_key} | h<${height_key}`).value
}
