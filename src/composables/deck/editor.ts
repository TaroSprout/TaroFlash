import { computed, ref, watch, type InjectionKey } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUpsertDeckMutation, useDeleteDeckMutation } from '@/api/decks'
import { useFirstCardInDeckQuery } from '@/api/cards'
import { useResetDeckReviewsMutation } from '@/api/reviews'
import { useDeckActions } from '@/composables/deck/actions'
import { useCoverImage } from '@/composables/deck/cover-image'
import { useDraft } from '@/composables/draft'
import { useNoticeStore } from '@/stores/notice-store'
import { DECK_SETTINGS_DEFAULTS, DECK_CONFIG_DEFAULTS } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'

// The editable surface of a deck — the columns saveDeck persists.
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
 * Reactive state + mutations for editing one deck, or staging a brand-new one
 * when `deck` is omitted. Tabs and designers mutate `draft` directly.
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

  const { state: draft, is_dirty, reset: resetDraft, rebase } = useDraft(buildDeckBase)

  const active_side = ref<CardSide>('cover')
  const title_error = ref<string>()

  const { t } = useI18n()
  const notice = useNoticeStore()
  // Only a brand-new deck (no `deck` at all) ever reaches the create-deck
  // guard below — an existing deck's edit never asks whether the member can
  // create one, so the deck-count check that guard depends on stays unmounted.
  const deck_actions = deck?.id ? undefined : useDeckActions()
  const upsert_mutation = useUpsertDeckMutation()
  const delete_mutation = useDeleteDeckMutation()
  const reset_reviews_mutation = useResetDeckReviewsMutation()
  const cover_image = useCoverImage(
    () => draft.cover_config,
    () => deck?.id
  )

  // The design preview shows the deck's first card. Disabled for unsaved decks
  // (no id), so deck-create just falls back to placeholder text.
  const cards_query = useFirstCardInDeckQuery(() => deck?.id)
  const first_card = computed(() => cards_query.data.value?.[0])
  const preview_front_text = computed(() => first_card.value?.front_text)
  const preview_back_text = computed(() => first_card.value?.back_text)

  const has_title = computed(() => !!draft.title?.trim())

  /**
   * Persist the draft. Existing decks flush straight through the upsert
   * mutation (rebasing on success so the dirty flag clears); a brand-new deck
   * routes through `createDeck` for the plan-limit guard + post-create flow.
   */
  async function saveDeck(): Promise<Deck | null> {
    if (!deck?.id) return deck_actions!.createDeck({ id: deck?.id as number, ...draft })

    // Uploads a staged cover before persisting cover_config; a failure aborts the save.
    try {
      await cover_image.commit()
    } catch (err) {
      const cause = err instanceof Error ? err.cause : undefined
      notice.error(
        cause === 'insert'
          ? t('toast.error.cover-image-save-failed')
          : t('toast.error.cover-image-upload-failed')
      )
      return null
    }

    try {
      const saved = await upsert_mutation.mutateAsync({ id: deck.id, ...draft })
      rebase()
      return saved
    } catch {
      return null
    }
  }

  /**
   * Revert the draft to its last-saved base. Also discards the staged cover
   * File/objectURL, which lives outside the draft — the draft's own reset only
   * restores `cover_config.image_path`.
   */
  function resetChanges() {
    resetDraft()
    cover_image.discardStaged()
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
    emitSfx('nav.page-forward')
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
    cover_image,
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
