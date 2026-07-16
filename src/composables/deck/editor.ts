import { computed, reactive, ref, watch, type InjectionKey } from 'vue'
import { useDeleteDeckMutation } from '@/api/decks'
import { useCardsInDeckInfiniteQuery } from '@/api/cards'
import { useResetDeckReviewsMutation } from '@/api/reviews'
import { useDeckActions } from '@/composables/deck/actions'
import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'
import { buildDeckPayload, hasDeckChanges, type DeckPacingEditorState } from '@/utils/deck/payload'
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

  const pacing = reactive<DeckPacingEditorState>({
    preset_id: deck?.review_pacing_preset_id ?? null,
    desired_retention_override: deck?.desired_retention_override ?? null,
    learning_steps_override: deck?.learning_steps_override ?? null,
    relearning_steps_override: deck?.relearning_steps_override ?? null,
    has_max_reviews_override: deck?.has_max_reviews_override ?? false,
    max_reviews_per_day_override: deck?.max_reviews_per_day_override ?? null,
    has_max_new_override: deck?.has_max_new_override ?? false,
    max_new_per_day_override: deck?.max_new_per_day_override ?? null
  })

  const active_side = ref<CardSide>('cover')
  const title_error = ref<string>()

  // The design preview shows the deck's first card. Disabled for unsaved decks
  // (no id), so deck-create just falls back to placeholder text.
  const cards_query = useCardsInDeckInfiniteQuery(() => settings.id)
  const first_card = computed(() => cards_query.data.value?.pages?.[0]?.[0])
  const preview_front_text = computed(() => first_card.value?.front_text)
  const preview_back_text = computed(() => first_card.value?.back_text)

  const initial_payload = buildDeckPayload({ settings, config, cover, card_attributes, pacing })
  const is_dirty = computed(() =>
    hasDeckChanges({ settings, config, cover, card_attributes, pacing }, initial_payload)
  )
  const has_title = computed(() => !!settings.title?.trim())

  const deck_actions = useDeckActions()
  const delete_mutation = useDeleteDeckMutation()
  const reset_reviews_mutation = useResetDeckReviewsMutation()

  async function saveDeck(): Promise<Deck | null> {
    const payload: Deck = {
      id: settings.id,
      ...buildDeckPayload({ settings, config, cover, card_attributes, pacing })
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
    emitSfx('slide_up')
    active_side.value = side
  }

  watch(
    () => settings.title,
    () => {
      title_error.value = undefined
    }
  )

  return {
    deck,
    settings,
    config,
    cover,
    card_attributes,
    pacing,
    active_side,
    preview_front_text,
    preview_back_text,
    is_dirty,
    has_title,
    title_error,
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
