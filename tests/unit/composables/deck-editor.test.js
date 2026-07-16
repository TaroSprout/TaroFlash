import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useDeckEditor } from '@/composables/deck/editor'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockCreateDeck, mockUpdateDeck } = vi.hoisted(() => ({
  mockCreateDeck: vi.fn().mockResolvedValue(true),
  mockUpdateDeck: vi.fn().mockResolvedValue(true)
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
  useDeleteDeckMutation: () => ({
    mutate: mockDeleteDeck,
    mutateAsync: mockDeleteDeck,
    isLoading: mockDeleteIsLoading
  })
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({
    createDeck: mockCreateDeck,
    updateDeck: mockUpdateDeck
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
    study_config: { study_all_cards: false, retry_failed_cards: true },
    cover_config: { color: '#ff0000' },
    ...overrides
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDeckEditor', () => {
  beforeEach(() => {
    mockCreateDeck.mockClear()
    mockCreateDeck.mockResolvedValue(true)
    mockUpdateDeck.mockClear()
    mockUpdateDeck.mockResolvedValue(true)
    mockDeleteDeck.mockClear()
    mockResetReviews.mockClear()
    mockResetReviews.mockResolvedValue(undefined)
    mockEmitSfx.mockClear()
    sessionStorage.clear()
  })

  // ── Initialization ─────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('initializes settings from deck fields', () => {
      const deck = makeDeck()
      const { settings } = useDeckEditor(deck)

      expect(settings.id).toBe(1)
      expect(settings.title).toBe('My Deck')
      expect(settings.description).toBe('A description')
      expect(settings.is_public).toBe(true)
    })

    test('initializes config from deck.study_config', () => {
      const deck = makeDeck({
        study_config: { study_all_cards: true }
      })
      const { config } = useDeckEditor(deck)

      expect(config.study_all_cards).toBe(true)
    })

    test('initializes config with defaults when deck has no study_config', () => {
      const deck = makeDeck({ study_config: undefined })
      const { config } = useDeckEditor(deck)

      expect(config.study_all_cards).toBe(false)
    })

    test('initializes cover from deck.cover_config', () => {
      const deck = makeDeck({ cover_config: { color: '#abc123' } })
      const { cover } = useDeckEditor(deck)

      expect(cover.color).toBe('#abc123')
    })

    test('initializes cover as empty object when deck has no cover_config', () => {
      const deck = makeDeck({ cover_config: undefined })
      const { cover } = useDeckEditor(deck)

      expect(cover).toEqual({})
    })

    test('works with no deck argument', () => {
      const { settings, config, cover } = useDeckEditor()

      expect(settings.id).toBeUndefined()
      expect(settings.title).toBeUndefined()
      expect(config.study_all_cards).toBe(false)
      expect(cover).toEqual({})
    })
  })

  // ── pacing ─────────────────────────────────────────────────────────────────

  describe('pacing', () => {
    test('initializes pacing from deck review-pacing fields [obligation]', () => {
      const deck = makeDeck({
        review_pacing_preset_id: 3,
        desired_retention_override: 0.85,
        learning_steps_override: ['1m', '10m'],
        relearning_steps_override: ['10m']
      })
      const { pacing } = useDeckEditor(deck)

      expect(pacing.preset_id).toBe(3)
      expect(pacing.desired_retention_override).toBe(0.85)
      expect(pacing.learning_steps_override).toEqual(['1m', '10m'])
      expect(pacing.relearning_steps_override).toEqual(['10m'])
    })

    test('initializes pacing fields to null when the deck has none set', () => {
      const { pacing } = useDeckEditor(makeDeck())

      expect(pacing.preset_id).toBeNull()
      expect(pacing.desired_retention_override).toBeNull()
      expect(pacing.learning_steps_override).toBeNull()
      expect(pacing.relearning_steps_override).toBeNull()
    })

    test('initializes pacing fields to null with no deck argument', () => {
      const { pacing } = useDeckEditor()

      expect(pacing.preset_id).toBeNull()
      expect(pacing.desired_retention_override).toBeNull()
      expect(pacing.learning_steps_override).toBeNull()
      expect(pacing.relearning_steps_override).toBeNull()
    })

    test('saveDeck includes pacing fields alongside title/config/cover in a single payload [obligation]', async () => {
      // There is no separate "save pacing" request — buildDeckPayload folds
      // pacing into the same payload as title/config/cover.
      const deck = makeDeck({
        review_pacing_preset_id: 3,
        desired_retention_override: 0.85,
        learning_steps_override: ['1m', '10m'],
        relearning_steps_override: ['10m']
      })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.review_pacing_preset_id).toBe(3)
      expect(arg.desired_retention_override).toBe(0.85)
      expect(arg.learning_steps_override).toEqual(['1m', '10m'])
      expect(arg.relearning_steps_override).toEqual(['10m'])
      expect(arg.title).toBe(deck.title)
      expect(arg.study_config).toMatchObject(deck.study_config)
    })

    test('reactive pacing changes are reflected in saveDeck payload', async () => {
      const { pacing, saveDeck } = useDeckEditor(makeDeck())

      pacing.preset_id = 7
      pacing.desired_retention_override = 0.92

      await saveDeck()

      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.review_pacing_preset_id).toBe(7)
      expect(arg.desired_retention_override).toBe(0.92)
    })
  })

  // ── saveDeck ───────────────────────────────────────────────────────────────

  describe('saveDeck', () => {
    test('calls upsertDeck with study_config key', async () => {
      const deck = makeDeck({
        study_config: { study_all_cards: true, retry_failed_cards: false }
      })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      expect(mockUpdateDeck).toHaveBeenCalledOnce()
      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.study_config).toMatchObject({
        study_all_cards: true,
        retry_failed_cards: false
      })
    })

    test('calls upsertDeck with cover_config key', async () => {
      const deck = makeDeck({ cover_config: { color: '#ff0000' } })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      expect(mockUpdateDeck).toHaveBeenCalledOnce()
      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.cover_config).toEqual({ color: '#ff0000' })
    })

    test('calls upsertDeck with settings fields', async () => {
      const deck = makeDeck({ title: 'Updated Title', is_public: false })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.title).toBe('Updated Title')
      expect(arg.is_public).toBe(false)
    })

    test('reactive config changes are reflected in saveDeck payload', async () => {
      const deck = makeDeck({
        study_config: { study_all_cards: false, retry_failed_cards: true }
      })
      const { config, saveDeck } = useDeckEditor(deck)

      config.study_all_cards = true

      await saveDeck()

      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.study_config.study_all_cards).toBe(true)
    })

    test('routes to createDeck when the deck has no id', async () => {
      const { saveDeck } = useDeckEditor()

      await saveDeck()

      expect(mockCreateDeck).toHaveBeenCalledOnce()
      expect(mockUpdateDeck).not.toHaveBeenCalled()
    })

    test('routes to updateDeck when the deck has an id', async () => {
      const { saveDeck } = useDeckEditor(makeDeck({ id: 42 }))

      await saveDeck()

      expect(mockUpdateDeck).toHaveBeenCalledOnce()
      expect(mockCreateDeck).not.toHaveBeenCalled()
    })

    test('returns the boolean result from the action', async () => {
      mockCreateDeck.mockResolvedValueOnce(false)
      const { saveDeck } = useDeckEditor()

      await expect(saveDeck()).resolves.toBe(false)
    })

    test('returns true from updateDeck by default', async () => {
      const { saveDeck } = useDeckEditor(makeDeck({ id: 1 }))

      await expect(saveDeck()).resolves.toBe(true)
    })
  })

  // ── card_attributes ────────────────────────────────────────────────────────

  describe('card_attributes', () => {
    test('initializes card_attributes from deck.card_attributes', () => {
      const deck = makeDeck({
        card_attributes: {
          front: { text_size: 'huge', horizontal_alignment: 'left' },
          back: { text_size: 'small' }
        }
      })
      const { card_attributes } = useDeckEditor(deck)

      expect(card_attributes.front.text_size).toBe('huge')
      expect(card_attributes.front.horizontal_alignment).toBe('left')
      expect(card_attributes.back.text_size).toBe('small')
    })

    test('initializes card_attributes with empty sides when deck has no card_attributes', () => {
      const deck = makeDeck({ card_attributes: undefined })
      const { card_attributes } = useDeckEditor(deck)

      expect(card_attributes).toEqual({ front: {}, back: {} })
    })

    test('initializes card_attributes with empty sides with no deck argument', () => {
      const { card_attributes } = useDeckEditor()

      expect(card_attributes).toEqual({ front: {}, back: {} })
    })

    test('saveDeck includes card_attributes in payload', async () => {
      const deck = makeDeck({
        card_attributes: {
          front: { text_size: 'ginormous', vertical_alignment: 'bottom' },
          back: { text_size: 'medium' }
        }
      })
      const { saveDeck } = useDeckEditor(deck)

      await saveDeck()

      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.card_attributes).toEqual({
        front: { text_size: 'ginormous', vertical_alignment: 'bottom' },
        back: { text_size: 'medium' }
      })
    })

    test('reactive card_attributes changes are reflected in saveDeck payload', async () => {
      const deck = makeDeck({
        card_attributes: { front: { text_size: 'small' }, back: {} }
      })
      const { card_attributes, saveDeck } = useDeckEditor(deck)

      card_attributes.front.text_size = 'x-large'
      card_attributes.front.horizontal_alignment = 'right'
      card_attributes.back.vertical_alignment = 'top'

      await saveDeck()

      const [arg] = mockUpdateDeck.mock.calls[0]
      expect(arg.card_attributes.front.text_size).toBe('x-large')
      expect(arg.card_attributes.front.horizontal_alignment).toBe('right')
      expect(arg.card_attributes.back.vertical_alignment).toBe('top')
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

    test('flips to true when a settings field is mutated', () => {
      const { settings, is_dirty } = useDeckEditor(makeDeck())
      settings.title = 'Renamed'
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when a study_config field is mutated', () => {
      const { config, is_dirty } = useDeckEditor(
        makeDeck({ study_config: { study_all_cards: false } })
      )
      config.study_all_cards = true
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when cover_config is mutated', () => {
      const { cover, is_dirty } = useDeckEditor(makeDeck())
      cover.color = '#000000'
      expect(is_dirty.value).toBe(true)
    })

    test('flips to true when card_attributes is mutated', () => {
      const { card_attributes, is_dirty } = useDeckEditor(makeDeck())
      card_attributes.front.text_size = 6
      expect(is_dirty.value).toBe(true)
    })

    test('returns false again when a mutation is reverted to the original value', () => {
      const deck = makeDeck({ title: 'Original' })
      const { settings, is_dirty } = useDeckEditor(deck)
      settings.title = 'Changed'
      expect(is_dirty.value).toBe(true)
      settings.title = 'Original'
      expect(is_dirty.value).toBe(false)
    })

    test('flips to true when only a pacing field is mutated [obligation]', () => {
      const { pacing, is_dirty } = useDeckEditor(makeDeck())
      pacing.desired_retention_override = 0.8
      expect(is_dirty.value).toBe(true)
    })
  })

  // ── resetChanges ───────────────────────────────────────────────────────────

  describe('resetChanges [obligation]', () => {
    test('restores cover/config/card_attributes to their original deck values without mutating the original deck object [obligation]', () => {
      const deck = makeDeck({
        cover_config: { color: '#ff0000', theme: 'sunrise' },
        study_config: { study_all_cards: false, shuffle: false },
        card_attributes: {
          front: { text_size: 'medium' },
          back: { text_size: 'small' }
        }
      })
      const deck_snapshot = structuredClone(deck)
      const { cover, config, card_attributes, resetChanges } = useDeckEditor(deck)

      cover.theme = 'midnight'
      config.shuffle = true
      card_attributes.front.text_size = 'huge'

      resetChanges()

      expect(cover).toEqual(deck_snapshot.cover_config)
      expect(config).toEqual(deck_snapshot.study_config)
      expect(card_attributes).toEqual(deck_snapshot.card_attributes)
      expect(deck).toEqual(deck_snapshot)
    })

    test('is_dirty is false again after resetChanges, across settings/config/cover/card_attributes/pacing edits [obligation]', () => {
      const deck = makeDeck({
        cover_config: { color: '#ff0000' },
        study_config: { study_all_cards: false }
      })
      const { settings, config, cover, card_attributes, pacing, is_dirty, resetChanges } =
        useDeckEditor(deck)

      settings.title = 'Renamed'
      config.study_all_cards = true
      cover.color = '#000000'
      card_attributes.front.text_size = 'huge'
      pacing.desired_retention_override = 0.8
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
