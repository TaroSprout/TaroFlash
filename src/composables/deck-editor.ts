import { computed, reactive, ref, type InjectionKey } from 'vue'
import { useDeleteDeckMutation } from '@/api/decks'
import { useResetDeckReviewsMutation } from '@/api/reviews'
import { useDeckActions } from '@/composables/deck/use-deck-actions'
import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'
import { buildDeckPayload, hasDeckChanges } from '@/utils/deck/payload'
import { emitSfx } from '@/sfx/bus'

/**
 * Reactive state + mutations for editing one deck (or staging a brand-new one
 * when `deck` is omitted). Owns the in-flight `settings` / `config` / `cover`
 * objects that the deck-settings tabs bind into, plus the persistence
 * helpers that flush them to the backend.
 */
export function useDeckEditor(deck?: Deck) {
  const settings = reactive<Omit<Deck, 'study_config' | 'cover_config'>>({
    id: deck?.id as number,
    title: deck?.title,
    description: deck?.description,
    is_public: deck?.is_public ?? DECK_SETTINGS_DEFAULTS.is_public,
    updated_at: deck?.updated_at
  })

  const config = reactive<DeckConfig>(
    deck?.study_config ?? {
      study_all_cards: DECK_CONFIG_DEFAULTS.study_all_cards
    }
  )

  const cover = reactive<DeckCover>(deck?.cover_config ?? {})
  const card_attributes = reactive<DeckCardAttributes>({
    front: deck?.card_attributes?.front ?? {},
    back: deck?.card_attributes?.back ?? {}
  })

  const active_side = ref<CardSide>('cover')

  const initial_payload = buildDeckPayload({ settings, config, cover, card_attributes })
  const is_dirty = computed(() =>
    hasDeckChanges({ settings, config, cover, card_attributes }, initial_payload)
  )

  const deck_actions = useDeckActions()
  const delete_mutation = useDeleteDeckMutation()
  const reset_reviews_mutation = useResetDeckReviewsMutation()

  async function saveDeck(): Promise<Deck | null> {
    const payload: Deck = {
      id: settings.id,
      ...buildDeckPayload({ settings, config, cover, card_attributes })
    }
    return settings.id
      ? await deck_actions.updateDeck(payload)
      : await deck_actions.createDeck(payload)
  }

  async function deleteDeck(): Promise<boolean> {
    if (!deck?.id) return false

    try {
      await delete_mutation.mutateAsync(deck.id)
      return true
    } catch {
      return false
    }
  }

  /** Wipe FSRS state + review-log history for every card in the deck. No-op for unsaved decks. */
  async function resetReviews(): Promise<boolean> {
    if (!deck?.id) return false

    try {
      await reset_reviews_mutation.mutateAsync(deck.id)
      return true
    } catch {
      return false
    }
  }

  /** Switch the design tab's previewed side. No-op when already active. */
  function setActiveSide(side: CardSide) {
    if (side === active_side.value) return
    emitSfx('ui.slide_up')
    active_side.value = side
  }

  return {
    deck,
    settings,
    config,
    cover,
    card_attributes,
    active_side,
    is_dirty,
    deleting: delete_mutation.isLoading,
    resetting_reviews: reset_reviews_mutation.isLoading,
    saveDeck,
    deleteDeck,
    resetReviews,
    setActiveSide
  }
}

export type DeckEditor = ReturnType<typeof useDeckEditor>

/**
 * Inject key for the deck-settings modal's editor instance. The modal root
 * provides the `useDeckEditor()` result; tabs and nested components
 * `inject(deckEditorKey)` to read/write editor state without prop drilling.
 */
export const deckEditorKey = Symbol('deckEditor') as InjectionKey<DeckEditor>
