import type { ComputedRef, InjectionKey } from 'vue'
import type { TabModalLayout } from '@/composables/ui/tab-modal-layout'
import type { BreakpointKey } from '@/composables/ui/media-query'

export type SettingsLayout = TabModalLayout

/**
 * Breakpoint keys where the settings modal pins to the bottom edge as a mobile sheet.
 * Shared by `useSettingsModal` (passed as `mobile_below_width`/`mobile_below_height` to
 * `modal.open`) and the settings modal's own recede/restore pin check, so the two can't drift.
 */
export const SETTINGS_SHEET_BREAKPOINTS: { width: BreakpointKey; height: BreakpointKey } = {
  width: 'mlg',
  height: 'md'
}

export const settingsLayoutKey: InjectionKey<ComputedRef<SettingsLayout>> =
  Symbol('settings-layout')

export type SettingsClose = () => void
export const settingsCloseKey: InjectionKey<SettingsClose> = Symbol('settings-close')

/** Lets a descendant dial the settings modal back/forward when it opens a modal on top of it. */
export type SettingsRecede = { recede: () => void; restore: () => void }
export const settingsRecedeKey: InjectionKey<SettingsRecede> = Symbol('settings-recede')
