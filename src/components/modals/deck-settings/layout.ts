import type { ComputedRef, InjectionKey } from 'vue'

export type DeckSettingsLayout = 'sheet' | 'tablet' | 'desktop'

export const deckSettingsLayoutKey: InjectionKey<ComputedRef<DeckSettingsLayout>> =
  Symbol('deck-settings-layout')

export type DeckSettingsClose = (response?: boolean) => void
export const deckSettingsCloseKey: InjectionKey<DeckSettingsClose> = Symbol('deck-settings-close')
