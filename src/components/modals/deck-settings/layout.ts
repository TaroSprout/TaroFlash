import type { ComputedRef, InjectionKey } from 'vue'

export type DeckSettingsLayout = 'sheet' | 'tablet' | 'desktop'

export const deckSettingsLayoutKey: InjectionKey<ComputedRef<DeckSettingsLayout>> =
  Symbol('deck-settings-layout')
