import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useDeckEditor } from '@/composables/deck/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockUpsertMutateAsync, mockCreateDeck } = vi.hoisted(() => ({
  mockUpsertMutateAsync: vi.fn().mockResolvedValue({ id: 1, title: 'Saved Deck' }),
  mockCreateDeck: vi.fn().mockResolvedValue({ id: 99, title: 'Created Deck' })
}))

const { mockDeleteDeck, mockDeleteIsLoading } = vi.hoisted(() => {
  const ref = { value: false }
  return {
    mockDeleteDeck: vi.fn().mockResolvedValue(undefined),
    mockDeleteIsLoading: ref
  }
})

const { mockResetReviews, mockResetReviewsIsLoading } = vi.hoisted(() => ({
  mockResetReviews: vi.fn().mockResolvedValue(undefined),
  mockResetReviewsIsLoading: { value: false }
}))

const { mockEmitSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn()
}))

// useCardsInDeckInfiniteQuery is called inside useDeckEditor to power the
// design preview. Stub it so unit tests don't need Pinia Colada / getActivePinia.
vi.mock('@/api/cards', () => ({
  useCardsInDeckInfiniteQuery: () => ({ data: { value: undefined } })
}))

vi.mock('@/api/decks', () => ({
  useUpsertDeckMutation: () => ({
    mutate: mockUpsertMutateAsync,
    mutateAsync: mockUpsertMutateAsync,
    isLoading: { value: false }
  }),
  useDeleteDeckMutation: () => ({
    mutate: mockDeleteDeck,
    mutateAsync: mockDeleteDeck,
    isLoading: mockDeleteIsLoading
  })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({
    createDeck: mockCreateDeck
  })
}))

vi.mock('@/api/reviews', () => ({
  useResetDeckReviewsMutation: () => ({
    mutate: mockResetReviews,
    mutateAsync: mockResetReviews,
    isLoading: mockResetReviewsIsLoading
  })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeck(overrides = {}) {
  return {
    id: 1,
    title: 'My Deck',
    description: 'A description',
    is_public: true,
    updated_at: '2026-01-01T00:00:00Z',
    study_config: { shuffle: false, retry_failed_cards: true },
    cover_config: { color: '#ff0000' },
    review_pacing_preset_id: null,
    pacing_overrides: {},
    ...overrides
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDeckEditor', () => {
  beforeEach(() => {
    mockUpsertMutateAsync.mockClear()
    mockUpsertMutateAsync.mockResolvedValue({ id: 1, title: 'Saved Deck' })
    mockCreateDeck.mockClear()
    mockCreateDeck.mockResolvedValue({ id: 99, title: 'Created Deck' })
    mockDeleteDeck.mockClear()
    mockResetReviews.mockClear()
    mockResetReviews.mockResolvedValue(undefined)
    mockEmitSfx.mockClear()
  })

  // ── Initialization ─────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('initializes draft settings from deck fields', () => {
      const deck = makeDeck()
      const { draft } = useDeckEditor(deck)

      expect(draft.title).toBe('My Deck')
      expect(draft.description).toBe('A description')
      expect(draft.is_public).toBe(true)
    })

    test('initializes draft.study_config from deck.study_config, merged over defaults', () => {
      const deck = makeDeck({ study_config: { shuffle: true } })
      const { draft } = useDeckEditor(deck)

      expect(draft.study_config.shuffle).toBe(true)
      expect(draft.study_config.flip_cards).toBe(false)
    })

    test('initializes draft.study_config with defaults when deck has no study_config', () => {
      const deck = makeDeck({ study_config: undefined })
      const { draft } = useDeckEditor(deck)

      expect(draft.study_config.shuffle).toBe(false)
    })

    test('initializes draft.cover_config from deck.cover_config', () => {
      const deck = makeDeck({ cover_config: { color: '#abc123' } })
      const { draft } = useDeckEditor(deck)

      expect(draft.cover_config.color).toBe('#abc123')
    })

    test('initializes draft.cover_config as empty object when deck has no cover_config', () => {
      const deck = makeDeck({ cover_config: undefined })
      const { draft } = useDeckEditor(deck)

      expect(draft.cover_config).toEqual({})
    })

    test('works with no deck argument', () => {
      const { draft } = useDeckEditor()

      expect(draft.title).toBeUndefined()
      expect(draft.study_config.shuffle).toBe(false)
      expect(draft.cover_config).toEqual({})
      expect(draft.review_pacing_preset_id).toBeNull()
      expect(draft.pacing_overrides).toEqual({})
    })
  })

  // ── pacing draft fields ────────────────────────────────────────────────────

  describe('pacing draft fields', () => {
    test('initializes review_pacing_preset_id and pacing_overrides from the deck [obligation]', () => {
      const deck = makeDeck({
        review_pacing_preset_id: 3,
        pacing_overrides: { desired_retention: 85, leech_threshold: 12 }
      })
      const { draft } = useDeckEditor(deck)

      expect(draft.review_pacing_preset_id).toBe(3)
      expect(draft.pacing_overrides).toEqual({ desired_retention: 85, leech_threshold: 12 })
    })

    test('defaults review_pacing_preset_id to null and pacing_overrides to {} when the deck has none set', () => {
      const { draft } = useDeckEditor(
        makeDeck({ review_pacing_preset_id: undefined, pacing_overrides: undefined })
      )

      expect(draft.review_pacing_preset_id).toBeNull()
      expect(draft.pacing_overrides).toEqual({})
    })
  })

  // ── saveDeck ───────────────────────────────────────────────────────────────

  describe('saveDeck', () => {
    test('calls the upsert mutation directly for an existing deck, with study_config/cover_config/pacing folded in', async () => {
      const deck = makeDeck({
        study_config: { shuffle: true, retry_failed_cards: false },
        review_pacing_preset_id: 3,
        pacing_overrides: { desired_retention: 92 }
      })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      expect(mockUpsertMutateAsync).toHaveBeenCalledOnce()
      const [arg] = mockUpsertMutateAsync.mock.calls[0]
      expect(arg.id).toBe(1)
      expect(arg.study_config).toMatchObject({
        shuffle: true,
        retry_failed_cards: false
      })
      expect(arg.review_pacing_preset_id).toBe(3)
      expect(arg.pacing_overrides).toEqual({ desired_retention: 92 })
    })

    test('routes to createDeck (not the upsert mutation) when the deck has no id', async () => {
      const { saveDeck } = useDeckEditor()

      await saveDeck()

      expect(mockCreateDeck).toHaveBeenCalledOnce()
      expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
    })

    test('routes to the upsert mutation (not createDeck) when the deck has an id', async () => {
      const { saveDeck } = useDeckEditor(makeDeck({ id: 42 }))

      await saveDeck()

      expect(mockUpsertMutateAsync).toHaveBeenCalledOnce()
      expect(mockCreateDeck).not.toHaveBeenCalled()
    })

    test('rebases the draft on a successful existing-deck save, so is_dirty clears without closing [obligation]', async () => {
      const deck = makeDeck({ title: 'Original' })
      const { draft, is_dirty, saveDeck } = useDeckEditor(deck)

      draft.title = 'Changed'
      expect(is_dirty.value).toBe(true)

      await saveDeck()

      expect(is_dirty.value).toBe(false)
    })

    test('returns null and does not rebase when the upsert mutation rejects', async () => {
      mockUpsertMutateAsync.mockRejectedValueOnce(new Error('Network error'))
      const deck = makeDeck({ title: 'Original' })
      const { draft, is_dirty, saveDeck } = useDeckEditor(deck)

      draft.title = 'Changed'
      const result = await saveDeck()

      expect(result).toBeNull()
      expect(is_dirty.value).toBe(true)
    })

    test('returns the result from createDeck for a new deck', async () => {
      mockCreateDeck.mockResolvedValueOnce(null)
      const { saveDeck } = useDeckEditor()

      await expect(saveDeck()).resolves.toBeNull()
    })
  })

  // ── card_attributes ────────────────────────────────────────────────────────

  describe('card_attributes', () => {
    test('initializes draft.card_attributes from deck.card_attributes', () => {
      const deck = makeDeck({
        card_attributes: {
          front: { text_size: 'huge', horizontal_alignment: 'left' },
          back: { text_size: 'small' }
        }
      })
      const { draft } = useDeckEditor(deck)

      expect(draft.card_attributes.front.text_size).toBe('huge')
      expect(draft.card_attributes.front.horizontal_alignment).toBe('left')
      expect(draft.card_attributes.back.text_size).toBe('small')
    })

    test('initializes draft.card_attributes with empty sides when deck has no card_attributes', () => {
      const deck = makeDeck({ card_attributes: undefined })
      const { draft } = useDeckEditor(deck)

      expect(draft.card_attributes).toEqual({ front: {}, back: {} })
    })

    test('saveDeck includes draft.card_attributes in the mutation payload', async () => {
      const deck = makeDeck({
        card_attributes: {
          front: { text_size: 'ginormous', vertical_alignment: 'bottom' },
          back: { text_size: 'medium' }
        }
      })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      const [arg] = mockUpsertMutateAsync.mock.calls[0]
      expect(arg.card_attributes).toEqual({
        front: { text_size: 'ginormous', vertical_alignment: 'bottom' },
        back: { text_size: 'medium' }
      })
    })
  })

  // ── is_dirty ───────────────────────────────────────────────────────────────

  describe('is_dirty', () => {
    test('is false right after init for an existing deck (no edits yet)', () => {
      const { is_dirty } = useDeckEditor(makeDeck())
      expect(is_dirty.value).toBe(false)
    })

    test('is false right after init for a new deck (no edits yet)', () => {
      const { is_dirty } = useDeckEditor()
      expect(is_dirty.value).toBe(false)
    })

    test('flips to true when draft.title is mutated', () => {
      const { draft, is_dirty } = useDeckEditor(makeDeck())
      draft.title = 'Renamed'
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when draft.study_config is mutated', () => {
      const { draft, is_dirty } = useDeckEditor(makeDeck({ study_config: { shuffle: false } }))
      draft.study_config.shuffle = true
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when draft.cover_config is mutated', () => {
      const { draft, is_dirty } = useDeckEditor(makeDeck())
      draft.cover_config.color = '#000000'
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when draft.card_attributes is mutated', () => {
      const { draft, is_dirty } = useDeckEditor(makeDeck())
      draft.card_attributes.front.text_size = 6
      expect(is_dirty.value).toBe(true)
    })

    test('returns false again when a mutation is reverted to the original value', () => {
      const deck = makeDeck({ title: 'Original' })
      const { draft, is_dirty } = useDeckEditor(deck)
      draft.title = 'Changed'
      expect(is_dirty.value).toBe(true)
      draft.title = 'Original'
      expect(is_dirty.value).toBe(false)
    })

    test('flips to true when only draft.pacing_overrides is mutated [obligation]', () => {
      const { draft, is_dirty } = useDeckEditor(makeDeck())
      draft.pacing_overrides.desired_retention = 80
      expect(is_dirty.value).toBe(true)
    })
  })

  // ── resetChanges ───────────────────────────────────────────────────────────

  describe('resetChanges [obligation]', () => {
    test('restores cover/config/card_attributes to their original deck values without mutating the original deck object [obligation]', () => {
      const deck = makeDeck({
        cover_config: { color: '#ff0000', theme: 'sunrise' },
        study_config: { shuffle: false, flip_cards: false },
        card_attributes: {
          front: { text_size: 'medium' },
          back: { text_size: 'small' }
        }
      })
      const deck_snapshot = structuredClone(deck)
      const { draft, resetChanges } = useDeckEditor(deck)

      draft.cover_config.theme = 'midnight'
      draft.study_config.shuffle = true
      draft.card_attributes.front.text_size = 'huge'

      resetChanges()

      expect(draft.cover_config).toEqual(deck_snapshot.cover_config)
      // study_config is merged over DECK_CONFIG_DEFAULTS when the draft base
      // is built, so the reset target carries the full default shape, not the
      // raw deck.study_config the test seeded.
      expect(draft.study_config).toMatchObject(deck_snapshot.study_config)
      expect(draft.card_attributes).toEqual(deck_snapshot.card_attributes)
      expect(deck).toEqual(deck_snapshot)
    })

    test('is_dirty is false again after resetChanges, across title/config/cover/card_attributes/pacing edits [obligation]', () => {
      const deck = makeDeck({
        cover_config: { color: '#ff0000' },
        study_config: { shuffle: false }
      })
      const { draft, is_dirty, resetChanges } = useDeckEditor(deck)

      draft.title = 'Renamed'
      draft.study_config.shuffle = true
      draft.cover_config.color = '#000000'
      draft.card_attributes.front.text_size = 'huge'
      draft.pacing_overrides.desired_retention = 80
      expect(is_dirty.value).toBe(true)

      resetChanges()

      expect(is_dirty.value).toBe(false)
    })
  })

  // ── deleteDeck ─────────────────────────────────────────────────────────────

  describe('deleteDeck', () => {
    test('calls the delete API with the deck id', async () => {
      const deck = makeDeck({ id: 42 })
      const { deleteDeck } = useDeckEditor(deck)

      await deleteDeck()

      expect(mockDeleteDeck).toHaveBeenCalledWith(42)
    })

    test('resolves to true on success', async () => {
      const { deleteDeck } = useDeckEditor(makeDeck({ id: 1 }))
      await expect(deleteDeck()).resolves.toBe(true)
    })

    test('does not call delete API when deck has no id, and resolves false', async () => {
      const deck = makeDeck({ id: undefined })
      const { deleteDeck } = useDeckEditor(deck)

      await expect(deleteDeck()).resolves.toBe(false)
      expect(mockDeleteDeck).not.toHaveBeenCalled()
    })

    test('resolves to false (does not throw) when delete API rejects', async () => {
      mockDeleteDeck.mockRejectedValueOnce(new Error('Network error'))
      const deck = makeDeck({ id: 1 })
      const { deleteDeck } = useDeckEditor(deck)

      await expect(deleteDeck()).resolves.toBe(false)
    })

    test('exposes the mutation isLoading ref as `deleting`', () => {
      const { deleting } = useDeckEditor(makeDeck({ id: 1 }))
      expect(deleting).toBe(mockDeleteIsLoading)
    })
  })

  // ── resetReviews ───────────────────────────────────────────────────────────

  describe('resetReviews', () => {
    test('calls the reset mutation with the deck id', async () => {
      const { resetReviews } = useDeckEditor(makeDeck({ id: 42 }))

      await resetReviews()

      expect(mockResetReviews).toHaveBeenCalledWith(42)
    })

    test('resolves to true on success', async () => {
      const { resetReviews } = useDeckEditor(makeDeck({ id: 1 }))
      await expect(resetReviews()).resolves.toBe(true)
    })

    test('does not call the mutation when deck has no id, and resolves false', async () => {
      const { resetReviews } = useDeckEditor(makeDeck({ id: undefined }))

      await expect(resetReviews()).resolves.toBe(false)
      expect(mockResetReviews).not.toHaveBeenCalled()
    })

    test('resolves to false (does not throw) when the mutation rejects', async () => {
      mockResetReviews.mockRejectedValueOnce(new Error('Network error'))
      const { resetReviews } = useDeckEditor(makeDeck({ id: 1 }))

      await expect(resetReviews()).resolves.toBe(false)
    })

    test('exposes the mutation isLoading ref as `resetting_reviews`', () => {
      const { resetting_reviews } = useDeckEditor(makeDeck({ id: 1 }))
      expect(resetting_reviews).toBe(mockResetReviewsIsLoading)
    })
  })

  // ── preview_front_text / preview_back_text ─────────────────────────────────

  describe('preview_front_text / preview_back_text', () => {
    test('are undefined when the query returns no data (unsaved deck) [obligation]', () => {
      const { preview_front_text, preview_back_text } = useDeckEditor()
      expect(preview_front_text.value).toBeUndefined()
      expect(preview_back_text.value).toBeUndefined()
    })
  })

  // ── active_side / setActiveSide ─────────────────────────────────────────────

  describe('active_side / setActiveSide', () => {
    test('initializes active_side to "cover"', () => {
      const { active_side } = useDeckEditor(makeDeck())
      expect(active_side.value).toBe('cover')
    })

    test('setActiveSide updates active_side and emits sfx', () => {
      const { active_side, setActiveSide } = useDeckEditor(makeDeck())

      setActiveSide('front')

      expect(active_side.value).toBe('front')
      expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
    })

    test('setActiveSide is a no-op when side is already active', () => {
      const { active_side, setActiveSide } = useDeckEditor(makeDeck())

      setActiveSide('cover')

      expect(active_side.value).toBe('cover')
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })

    test('setActiveSide cycles through cover/front/back', () => {
      const { active_side, setActiveSide } = useDeckEditor(makeDeck())

      setActiveSide('front')
      setActiveSide('back')
      setActiveSide('cover')

      expect(active_side.value).toBe('cover')
      expect(mockEmitSfx).toHaveBeenCalledTimes(3)
    })
  })
})
