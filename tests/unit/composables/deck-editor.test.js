import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { useDeckEditor } from '@/composables/deck/editor'

const i18n = createI18n({ locale: 'en-us', legacy: false, messages })

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

const { mockNoticeError } = vi.hoisted(() => ({
  mockNoticeError: vi.fn()
}))

// The cover-image staging composable is its own unit (tests/unit/composables/
// deck/cover-image.test.js) — mock it here so editor tests exercise only the
// saveDeck/resetChanges orchestration around commit()/discardStaged().
const { mockCoverCommit, mockCoverDiscardStaged } = vi.hoisted(() => ({
  mockCoverCommit: vi.fn().mockResolvedValue(undefined),
  mockCoverDiscardStaged: vi.fn()
}))

// useCardsInDeckInfiniteQuery is called inside useDeckEditor to power the
// design preview. Stub it so unit tests don't need Pinia Colada / getActivePinia.
const { mockCardsInDeckInfiniteQuery } = vi.hoisted(() => ({
  mockCardsInDeckInfiniteQuery: vi.fn(() => ({ data: { value: undefined } }))
}))

vi.mock('@/api/cards', () => ({
  useCardsInDeckInfiniteQuery: mockCardsInDeckInfiniteQuery
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

vi.mock('@/composables/deck/cover-image', () => ({
  useCoverImage: () => ({
    commit: mockCoverCommit,
    discardStaged: mockCoverDiscardStaged
  })
}))

vi.mock('@/api/reviews', () => ({
  useResetDeckReviewsMutation: () => ({
    mutate: mockResetReviews,
    mutateAsync: mockResetReviews,
    isLoading: mockResetReviewsIsLoading
  })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: mockNoticeError })
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

// useDeckEditor now calls useI18n() (for the cover-image save/upload toast
// copy) directly in its setup body, which vue-i18n only allows inside an
// active component instance — mount a headless host app, like the
// useFaceImageUpload composable tests do.
function withDeckEditor(deck) {
  let result
  const app = createApp({
    setup() {
      result = useDeckEditor(deck)
      return () => null
    }
  })
  app.use(i18n)
  app.mount(document.createElement('div'))
  return { editor: result, unmount: () => app.unmount() }
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
    mockNoticeError.mockClear()
    mockCoverCommit.mockReset().mockResolvedValue(undefined)
    mockCoverDiscardStaged.mockClear()
  })

  // ── Initialization ─────────────────────────────────────────────────────────

  describe('initialization', () => {
    test('initializes draft settings from deck fields', () => {
      const deck = makeDeck()
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.title).toBe('My Deck')
      expect(editor.draft.description).toBe('A description')
      expect(editor.draft.is_public).toBe(true)
      unmount()
    })

    test('initializes draft.study_config from deck.study_config, merged over defaults', () => {
      const deck = makeDeck({ study_config: { shuffle: true } })
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.study_config.shuffle).toBe(true)
      expect(editor.draft.study_config.starting_side).toBe('front')
      unmount()
    })

    test('initializes draft.study_config with defaults when deck has no study_config', () => {
      const deck = makeDeck({ study_config: undefined })
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.study_config.shuffle).toBe(false)
      unmount()
    })

    test('initializes draft.cover_config from deck.cover_config', () => {
      const deck = makeDeck({ cover_config: { color: '#abc123' } })
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.cover_config.color).toBe('#abc123')
      unmount()
    })

    test('initializes draft.cover_config as empty object when deck has no cover_config', () => {
      const deck = makeDeck({ cover_config: undefined })
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.cover_config).toEqual({})
      unmount()
    })

    test('works with no deck argument', () => {
      const { editor, unmount } = withDeckEditor()

      expect(editor.draft.title).toBeUndefined()
      expect(editor.draft.study_config.shuffle).toBe(false)
      expect(editor.draft.cover_config).toEqual({})
      expect(editor.draft.review_pacing_preset_id).toBeNull()
      expect(editor.draft.pacing_overrides).toEqual({})
      unmount()
    })

    test('exposes the cover_image staging composable', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      expect(editor.cover_image.commit).toBe(mockCoverCommit)
      unmount()
    })
  })

  // ── pacing draft fields ────────────────────────────────────────────────────

  describe('pacing draft fields', () => {
    test('initializes review_pacing_preset_id and pacing_overrides from the deck [obligation]', () => {
      const deck = makeDeck({
        review_pacing_preset_id: 3,
        pacing_overrides: { desired_retention: 85, leech_threshold: 12 }
      })
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.review_pacing_preset_id).toBe(3)
      expect(editor.draft.pacing_overrides).toEqual({ desired_retention: 85, leech_threshold: 12 })
      unmount()
    })

    test('defaults review_pacing_preset_id to null and pacing_overrides to {} when the deck has none set', () => {
      const { editor, unmount } = withDeckEditor(
        makeDeck({ review_pacing_preset_id: undefined, pacing_overrides: undefined })
      )

      expect(editor.draft.review_pacing_preset_id).toBeNull()
      expect(editor.draft.pacing_overrides).toEqual({})
      unmount()
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
      const { editor, unmount } = withDeckEditor(deck)

      await editor.saveDeck()

      expect(mockUpsertMutateAsync).toHaveBeenCalledOnce()
      const [arg] = mockUpsertMutateAsync.mock.calls[0]
      expect(arg.id).toBe(1)
      expect(arg.study_config).toMatchObject({
        shuffle: true,
        retry_failed_cards: false
      })
      expect(arg.review_pacing_preset_id).toBe(3)
      expect(arg.pacing_overrides).toEqual({ desired_retention: 92 })
      unmount()
    })

    test('routes to createDeck (not the upsert mutation) when the deck has no id', async () => {
      const { editor, unmount } = withDeckEditor()

      await editor.saveDeck()

      expect(mockCreateDeck).toHaveBeenCalledOnce()
      expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
      unmount()
    })

    test('routes to the upsert mutation (not createDeck) when the deck has an id', async () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 42 }))

      await editor.saveDeck()

      expect(mockUpsertMutateAsync).toHaveBeenCalledOnce()
      expect(mockCreateDeck).not.toHaveBeenCalled()
      unmount()
    })

    test('rebases the draft on a successful existing-deck save, so is_dirty clears without closing [obligation]', async () => {
      const deck = makeDeck({ title: 'Original' })
      const { editor, unmount } = withDeckEditor(deck)

      editor.draft.title = 'Changed'
      expect(editor.is_dirty.value).toBe(true)

      await editor.saveDeck()

      expect(editor.is_dirty.value).toBe(false)
      unmount()
    })

    test('returns null and does not rebase when the upsert mutation rejects', async () => {
      mockUpsertMutateAsync.mockRejectedValueOnce(new Error('Network error'))
      const deck = makeDeck({ title: 'Original' })
      const { editor, unmount } = withDeckEditor(deck)

      editor.draft.title = 'Changed'
      const result = await editor.saveDeck()

      expect(result).toBeNull()
      expect(editor.is_dirty.value).toBe(true)
      unmount()
    })

    test('returns the result from createDeck for a new deck', async () => {
      mockCreateDeck.mockResolvedValueOnce(null)
      const { editor, unmount } = withDeckEditor()

      await expect(editor.saveDeck()).resolves.toBeNull()
      unmount()
    })

    // ── cover_image.commit() pre-step [obligation] ────────────────────────────

    test('calls cover_image.commit() before the upsert mutation for an existing deck [obligation]', async () => {
      const { editor, unmount } = withDeckEditor(makeDeck())

      await editor.saveDeck()

      expect(mockCoverCommit).toHaveBeenCalledOnce()
      expect(mockUpsertMutateAsync).toHaveBeenCalledOnce()
      unmount()
    })

    test('a commit() rejection with cause "insert" shows the cover-image-save-failed toast, skips the upsert, and returns null [obligation]', async () => {
      mockCoverCommit.mockRejectedValueOnce(new Error('insert failed', { cause: 'insert' }))
      const { editor, unmount } = withDeckEditor(makeDeck())

      const result = await editor.saveDeck()

      expect(mockNoticeError).toHaveBeenCalledWith("Couldn't save image — try again")
      expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
      expect(result).toBeNull()
      unmount()
    })

    test('a commit() rejection with cause "upload" shows the cover-image-upload-failed toast, skips the upsert, and returns null [obligation]', async () => {
      mockCoverCommit.mockRejectedValueOnce(new Error('upload failed', { cause: 'upload' }))
      const { editor, unmount } = withDeckEditor(makeDeck())

      const result = await editor.saveDeck()

      expect(mockNoticeError).toHaveBeenCalledWith("Couldn't upload your image")
      expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
      expect(result).toBeNull()
      unmount()
    })

    test('a non-Error commit() rejection (no .cause) shows the cover-image-upload-failed toast [obligation]', async () => {
      mockCoverCommit.mockRejectedValueOnce('some non-error rejection')
      const { editor, unmount } = withDeckEditor(makeDeck())

      await editor.saveDeck()

      expect(mockNoticeError).toHaveBeenCalledWith("Couldn't upload your image")
      unmount()
    })

    test('a successful commit() is followed by the upsert + rebase [obligation]', async () => {
      const deck = makeDeck({ title: 'Original' })
      const { editor, unmount } = withDeckEditor(deck)

      editor.draft.title = 'Changed'
      await editor.saveDeck()

      expect(mockCoverCommit).toHaveBeenCalledOnce()
      expect(mockUpsertMutateAsync).toHaveBeenCalledOnce()
      expect(editor.is_dirty.value).toBe(false)
      unmount()
    })
  })

  // ── rebase ─────────────────────────────────────────────────────────────────
  // Exposed directly (not just through saveDeck) so preset actions can persist
  // just the pacing slice on their own and rebase only those keys [obligation].

  describe('rebase', () => {
    test('exposes the underlying useDraft rebase function [obligation]', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      expect(typeof editor.rebase).toBe('function')
      unmount()
    })

    test('rebase([key]) adopts only that key, leaving other staged edits dirty [obligation]', () => {
      const deck = makeDeck({ title: 'Original' })
      const { editor, unmount } = withDeckEditor(deck)

      editor.draft.title = 'Edited title'
      editor.draft.pacing_overrides.desired_retention = 0.8

      editor.rebase(['pacing_overrides'])

      expect(editor.draft.pacing_overrides).toEqual({ desired_retention: 0.8 })
      expect(editor.is_dirty.value).toBe(true)
      expect(editor.draft.title).toBe('Edited title')
      unmount()
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
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.card_attributes.front.text_size).toBe('huge')
      expect(editor.draft.card_attributes.front.horizontal_alignment).toBe('left')
      expect(editor.draft.card_attributes.back.text_size).toBe('small')
      unmount()
    })

    test('initializes draft.card_attributes with empty sides when deck has no card_attributes', () => {
      const deck = makeDeck({ card_attributes: undefined })
      const { editor, unmount } = withDeckEditor(deck)

      expect(editor.draft.card_attributes).toEqual({ front: {}, back: {} })
      unmount()
    })

    test('saveDeck includes draft.card_attributes in the mutation payload', async () => {
      const deck = makeDeck({
        card_attributes: {
          front: { text_size: 'ginormous', vertical_alignment: 'bottom' },
          back: { text_size: 'medium' }
        }
      })
      const { editor, unmount } = withDeckEditor(deck)

      await editor.saveDeck()

      const [arg] = mockUpsertMutateAsync.mock.calls[0]
      expect(arg.card_attributes).toEqual({
        front: { text_size: 'ginormous', vertical_alignment: 'bottom' },
        back: { text_size: 'medium' }
      })
      unmount()
    })
  })

  // ── is_dirty ───────────────────────────────────────────────────────────────

  describe('is_dirty', () => {
    test('is false right after init for an existing deck (no edits yet)', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      expect(editor.is_dirty.value).toBe(false)
      unmount()
    })

    test('is false right after init for a new deck (no edits yet)', () => {
      const { editor, unmount } = withDeckEditor()
      expect(editor.is_dirty.value).toBe(false)
      unmount()
    })

    test('flips to true when draft.title is mutated', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      editor.draft.title = 'Renamed'
      expect(editor.is_dirty.value).toBe(true)
      unmount()
    })

    test('flips to true when draft.study_config is mutated', () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ study_config: { shuffle: false } }))
      editor.draft.study_config.shuffle = true
      expect(editor.is_dirty.value).toBe(true)
      unmount()
    })

    test('flips to true when draft.cover_config is mutated', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      editor.draft.cover_config.color = '#000000'
      expect(editor.is_dirty.value).toBe(true)
      unmount()
    })

    test('flips to true when draft.card_attributes is mutated', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      editor.draft.card_attributes.front.text_size = 6
      expect(editor.is_dirty.value).toBe(true)
      unmount()
    })

    test('returns false again when a mutation is reverted to the original value', () => {
      const deck = makeDeck({ title: 'Original' })
      const { editor, unmount } = withDeckEditor(deck)
      editor.draft.title = 'Changed'
      expect(editor.is_dirty.value).toBe(true)
      editor.draft.title = 'Original'
      expect(editor.is_dirty.value).toBe(false)
      unmount()
    })

    test('flips to true when only draft.pacing_overrides is mutated [obligation]', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      editor.draft.pacing_overrides.desired_retention = 80
      expect(editor.is_dirty.value).toBe(true)
      unmount()
    })
  })

  // ── resetChanges ───────────────────────────────────────────────────────────

  describe('resetChanges [obligation]', () => {
    test('restores cover/config/card_attributes to their original deck values without mutating the original deck object [obligation]', () => {
      const deck = makeDeck({
        cover_config: { color: '#ff0000', theme: 'sunrise' },
        study_config: { shuffle: false, starting_side: 'front' },
        card_attributes: {
          front: { text_size: 'medium' },
          back: { text_size: 'small' }
        }
      })
      const deck_snapshot = structuredClone(deck)
      const { editor, unmount } = withDeckEditor(deck)

      editor.draft.cover_config.theme = 'midnight'
      editor.draft.study_config.shuffle = true
      editor.draft.card_attributes.front.text_size = 'huge'

      editor.resetChanges()

      expect(editor.draft.cover_config).toEqual(deck_snapshot.cover_config)
      // study_config is merged over DECK_CONFIG_DEFAULTS when the draft base
      // is built, so the reset target carries the full default shape, not the
      // raw deck.study_config the test seeded.
      expect(editor.draft.study_config).toMatchObject(deck_snapshot.study_config)
      expect(editor.draft.card_attributes).toEqual(deck_snapshot.card_attributes)
      expect(deck).toEqual(deck_snapshot)
      unmount()
    })

    test('is_dirty is false again after resetChanges, across title/config/cover/card_attributes/pacing edits [obligation]', () => {
      const deck = makeDeck({
        cover_config: { color: '#ff0000' },
        study_config: { shuffle: false }
      })
      const { editor, unmount } = withDeckEditor(deck)

      editor.draft.title = 'Renamed'
      editor.draft.study_config.shuffle = true
      editor.draft.cover_config.color = '#000000'
      editor.draft.card_attributes.front.text_size = 'huge'
      editor.draft.pacing_overrides.desired_retention = 80
      expect(editor.is_dirty.value).toBe(true)

      editor.resetChanges()

      expect(editor.is_dirty.value).toBe(false)
      unmount()
    })

    test('calls cover_image.discardStaged() [obligation]', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())

      editor.resetChanges()

      expect(mockCoverDiscardStaged).toHaveBeenCalledOnce()
      unmount()
    })
  })

  // ── deleteDeck ─────────────────────────────────────────────────────────────

  describe('deleteDeck', () => {
    test('calls the delete API with the deck id', async () => {
      const deck = makeDeck({ id: 42 })
      const { editor, unmount } = withDeckEditor(deck)

      await editor.deleteDeck()

      expect(mockDeleteDeck).toHaveBeenCalledWith(42)
      unmount()
    })

    test('resolves to true on success', async () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 1 }))
      await expect(editor.deleteDeck()).resolves.toBe(true)
      unmount()
    })

    test('does not call delete API when deck has no id, and resolves false', async () => {
      const deck = makeDeck({ id: undefined })
      const { editor, unmount } = withDeckEditor(deck)

      await expect(editor.deleteDeck()).resolves.toBe(false)
      expect(mockDeleteDeck).not.toHaveBeenCalled()
      unmount()
    })

    test('resolves to false (does not throw) when delete API rejects', async () => {
      mockDeleteDeck.mockRejectedValueOnce(new Error('Network error'))
      const deck = makeDeck({ id: 1 })
      const { editor, unmount } = withDeckEditor(deck)

      await expect(editor.deleteDeck()).resolves.toBe(false)
      unmount()
    })

    test('exposes the mutation isLoading ref as `deleting`', () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 1 }))
      expect(editor.deleting).toBe(mockDeleteIsLoading)
      unmount()
    })
  })

  // ── resetReviews ───────────────────────────────────────────────────────────

  describe('resetReviews', () => {
    test('calls the reset mutation with the deck id', async () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 42 }))

      await editor.resetReviews()

      expect(mockResetReviews).toHaveBeenCalledWith(42)
      unmount()
    })

    test('resolves to true on success', async () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 1 }))
      await expect(editor.resetReviews()).resolves.toBe(true)
      unmount()
    })

    test('does not call the mutation when deck has no id, and resolves false', async () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: undefined }))

      await expect(editor.resetReviews()).resolves.toBe(false)
      expect(mockResetReviews).not.toHaveBeenCalled()
      unmount()
    })

    test('resolves to false (does not throw) when the mutation rejects', async () => {
      mockResetReviews.mockRejectedValueOnce(new Error('Network error'))
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 1 }))

      await expect(editor.resetReviews()).resolves.toBe(false)
      unmount()
    })

    test('exposes the mutation isLoading ref as `resetting_reviews`', () => {
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 1 }))
      expect(editor.resetting_reviews).toBe(mockResetReviewsIsLoading)
      unmount()
    })
  })

  // ── preview_front_text / preview_back_text ─────────────────────────────────

  describe('preview_front_text / preview_back_text', () => {
    test('are undefined when the query returns no data (unsaved deck) [obligation]', () => {
      const { editor, unmount } = withDeckEditor()
      expect(editor.preview_front_text.value).toBeUndefined()
      expect(editor.preview_back_text.value).toBeUndefined()
      unmount()
    })

    // [obligation] regression: first_card used to read pages[0][0] directly —
    // a page is now { cards, next_rank }, so the preview must read pages[0].cards[0]
    test('reads the first card off pages[0].cards[0] under the { cards, next_rank } page shape [obligation]', () => {
      mockCardsInDeckInfiniteQuery.mockReturnValueOnce({
        data: {
          value: {
            pages: [{ cards: [{ front_text: 'Front A', back_text: 'Back A' }], next_rank: null }]
          }
        }
      })
      const { editor, unmount } = withDeckEditor(makeDeck({ id: 1 }))
      expect(editor.preview_front_text.value).toBe('Front A')
      expect(editor.preview_back_text.value).toBe('Back A')
      unmount()
    })
  })

  // ── active_side / setActiveSide ─────────────────────────────────────────────

  describe('active_side / setActiveSide', () => {
    test('initializes active_side to "cover"', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())
      expect(editor.active_side.value).toBe('cover')
      unmount()
    })

    test('setActiveSide updates active_side and emits sfx', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())

      editor.setActiveSide('front')

      expect(editor.active_side.value).toBe('front')
      expect(mockEmitSfx).toHaveBeenCalledWith('nav.page-forward')
      unmount()
    })

    test('setActiveSide is a no-op when side is already active', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())

      editor.setActiveSide('cover')

      expect(editor.active_side.value).toBe('cover')
      expect(mockEmitSfx).not.toHaveBeenCalled()
      unmount()
    })

    test('setActiveSide cycles through cover/front/back', () => {
      const { editor, unmount } = withDeckEditor(makeDeck())

      editor.setActiveSide('front')
      editor.setActiveSide('back')
      editor.setActiveSide('cover')

      expect(editor.active_side.value).toBe('cover')
      expect(mockEmitSfx).toHaveBeenCalledTimes(3)
      unmount()
    })
  })
})
