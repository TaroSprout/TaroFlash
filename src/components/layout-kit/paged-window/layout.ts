import { computed, type ComputedRef, type InjectionKey } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

export type WindowLayout = 'phone' | 'tablet' | 'desktop'

/** Current window layout, provided by paged-window for its pages to inject. */
export const windowLayoutKey: InjectionKey<ComputedRef<WindowLayout>> = Symbol('window-layout')

type WindowLayoutOptions = {
  phone_query?: string
  desktop_query?: string
}

/**
 * Resolves a window's tri-state layout from breakpoint queries and derives the
 * matching horizontal padding token.
 *
 * `desktop` requires `desktop_query` to be set and matched; otherwise the window
 * only ever toggles between `phone` and `tablet`.
 *
 * @example
 * const { layout_mode, window_px } = useWindowLayout({ desktop_query: 'w>=lg & fine' })
 */
export function useWindowLayout(opts?: WindowLayoutOptions) {
  const phone_query = opts?.phone_query ?? 'w<md'
  const desktop_query = opts?.desktop_query

  const is_phone = useMatchMedia(phone_query)
  const is_desktop = desktop_query ? useMatchMedia(desktop_query) : null

  const layout_mode = computed<WindowLayout>(() => {
    if (is_phone.value) return 'phone'
    if (is_desktop?.value) return 'desktop'
    return 'tablet'
  })

  const window_px = computed(() => (layout_mode.value === 'tablet' ? '4.5rem' : '2rem'))

  return { layout_mode, window_px }
}
