import type { ComputedRef, InjectionKey } from 'vue'
import type { TabModalLayout } from '@/composables/ui/tab-modal-layout'

export type SettingsLayout = TabModalLayout

export const settingsLayoutKey: InjectionKey<ComputedRef<SettingsLayout>> =
  Symbol('settings-layout')

export type SettingsClose = () => void
export const settingsCloseKey: InjectionKey<SettingsClose> = Symbol('settings-close')

/** Lets a descendant dial the settings modal back/forward when it opens a modal on top of it. */
export type SettingsRecede = { recede: () => void; restore: () => void }
export const settingsRecedeKey: InjectionKey<SettingsRecede> = Symbol('settings-recede')
