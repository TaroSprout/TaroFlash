import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

export type DeckContext = {
  cover_config?: DeckCover
  card_attributes?: DeckCardAttributes
}

export const DeckContextKey: InjectionKey<Ref<DeckContext>> = Symbol('study-session.deck-context')

export function provideDeckContext(context: Ref<DeckContext>) {
  provide(DeckContextKey, context)
}

export function useDeckContext(): Ref<DeckContext> {
  return inject(DeckContextKey, ref<DeckContext>({}))
}
