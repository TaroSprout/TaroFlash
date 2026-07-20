import { computed, ref, watch, type InjectionKey } from 'vue'
import { useUpsertDeckMutation, useDeleteDeckMutation } from '@/api/decks'
import { useCardsInDeckInfiniteQuery } from '@/api/cards'
import { useResetDeckReviewsMutation } from '@/api/reviews'
import { useDeckActions } from '@/composables/deck/actions'
import { useDraft } from '@/composables/draft'
import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'

// The editable surface of a deck: the columns save_deck persists, defaults
// merged in so the draft is always fully populated and dirty-diffing is clean.
export type DeckDraft = {
  title?: string
  description?: string
  is_public: boolean
  study_config: DeckConfig
  cover_config: DeckCover
  card_attributes: DeckCardAttributes
  review_pacing_preset_id: number | null
  pacing_overrides: PacingOverrides
}

/**
 * Reactive state + mutations for editing one deck (or staging a brand-new one
 * when `deck` is omitted). A single `useDraft` over the deck's editable columns
 * replaces the old per-field clone/payload/dirty machinery — tabs and designers
 * mutate `draft` directly, and `is_dirty` falls out of a deep diff against the
 * last-saved base.
 */
export function useDeckEditor(deck?: Deck) {
  function buildDeckBase(): DeckDraft {
    return {
      title: deck?.title,
      description: deck?.description,
      is_public: deck?.is_public ?? DECK_SETTINGS_DEFAULTS.is_public,
      study_config: { ...DECK_CONFIG_DEFAULTS, ...deck?.study_config },
      cover_config: { ...deck?.cover_config },
      card_attributes: {
        front: { ...deck?.card_attributes?.front },
        back: { ...deck?.card_attributes?.back }
      },
      review_pacing_preset_id: deck?.review_pacing_preset_id ?? null,
      pacing_overrides: { ...deck?.pacing_overrides }
    }
  }

  const { state: draft, is_dirty, reset: resetChanges, rebase } = useDraft(buildDeckBase)

  const active_side = ref<CardSide>('cover')
  const title_error = ref<string>()

  const deck_actions = useDeckActions()
  const upsert_mutation = useUpsertDeckMutation()
  const delete_mutation = useDeleteDeckMutation()
  const reset_reviews_mutation = useResetDeckReviewsMutation()

  // The design preview shows the deck's first card. Disabled for unsaved decks
  // (no id), so deck-create just falls back to placeholder text.
  const cards_query = useCardsInDeckInfiniteQuery(() => deck?.id)
  const first_card = computed(() => cards_query.data.value?.pages?.[0]?.[0])
  const preview_front_text = computed(() => first_card.value?.front_text)
  const preview_back_text = computed(() => first_card.value?.back_text)

  const has_title = computed(() => !!draft.title?.trim())

  /**
   * Persist the draft. Existing decks flush straight through the upsert
   * mutation (rebasing on success so the dirty flag clears); a brand-new deck
   * routes through `createDeck` for the plan-limit guard + post-create flow.
   */
  async function saveDeck(): Promise<Deck | null> {
    const payload: Deck = { id: deck?.id as number, ...draft }

    if (!payload.id) return deck_actions.createDeck(payload)

    try {
      const saved = await upsert_mutation.mutateAsync(payload)
      rebase()
      return saved
    } catch {
      return null
    }
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
    () => draft.title,
    () => {
      title_error.value = undefined
    }
  )

  return {
    deck,
    draft,
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
    resetChanges,
    rebase,
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
