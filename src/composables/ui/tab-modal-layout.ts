import { computed } from 'vue'
import { useMatchMedia } from './media-query'

export type TabModalLayout = 'sheet' | 'tablet' | 'desktop'

type TabModalLayoutOptions = {
  sheet_query?: string
  desktop_query?: string
}

export function useTabModalLayout(opts?: TabModalLayoutOptions) {
  const sheet_query = opts?.sheet_query ?? 'w<md'
  const desktop_query = opts?.desktop_query

  const _is_sheet = useMatchMedia(sheet_query)
  const _is_desktop = desktop_query ? useMatchMedia(desktop_query) : null

  const layout_mode = computed<TabModalLayout>(() => {
    if (_is_sheet.value) return 'sheet'
    if (_is_desktop?.value) return 'desktop'
    return 'tablet'
  })

  const sheet_px = computed(() => (layout_mode.value === 'tablet' ? '4.5rem' : '2rem'))

  return { layout_mode, sheet_px }
}
