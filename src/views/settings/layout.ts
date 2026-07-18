import type { InjectionKey } from 'vue'
import type { BreakpointKey } from '@/composables/ui/media-query'

/**
 * Breakpoint keys where the settings modal pins to the bottom edge as a mobile sheet.
 * Passed as `mobile_below_width`/`mobile_below_height` to `modal.open` by `useSettingsModal`.
 */
export const SETTINGS_SHEET_BREAKPOINTS: { width: BreakpointKey; height: BreakpointKey } = {
  width: 'mlg',
  height: 'md'
}

export type SettingsClose = () => void
export const settingsCloseKey: InjectionKey<SettingsClose> = Symbol('settings-close')
