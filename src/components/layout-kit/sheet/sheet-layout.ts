import { computed, type ComputedRef, type InjectionKey } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'

export type SheetLayout = 'phone' | 'tablet' | 'desktop'

/** Current sheet layout, provided by sheet-pager for its panes to inject. */
export const sheetLayoutKey: InjectionKey<ComputedRef<SheetLayout>> = Symbol('sheet-layout')

type SheetLayoutOptions = {
  phone_query?: string
  desktop_query?: string
}

/**
 * Resolves a sheet's tri-state layout from breakpoint queries and derives the
 * matching horizontal padding token.
 *
 * `desktop` requires `desktop_query` to be set and matched; otherwise the sheet
 * only ever toggles between `phone` and `tablet`.
 *
 * @example
 * const { layout_mode, sheet_px } = useSheetLayout({ desktop_query: 'w>=lg & fine' })
 */
export function useSheetLayout(opts?: SheetLayoutOptions) {
  const phone_query = opts?.phone_query ?? 'w<md'
  const desktop_query = opts?.desktop_query

  const is_phone = useMatchMedia(phone_query)
  const is_desktop = desktop_query ? useMatchMedia(desktop_query) : null

  const layout_mode = computed<SheetLayout>(() => {
    if (is_phone.value) return 'phone'
    if (is_desktop?.value) return 'desktop'
    return 'tablet'
  })

  const sheet_px = computed(() => (layout_mode.value === 'tablet' ? '4.5rem' : '2rem'))

  return { layout_mode, sheet_px }
}
