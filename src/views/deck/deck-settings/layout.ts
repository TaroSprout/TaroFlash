import type { InjectionKey } from 'vue'

export type DeckSettingsClose = (response?: boolean) => void
export const deckSettingsCloseKey: InjectionKey<DeckSettingsClose> = Symbol('deck-settings-close')
