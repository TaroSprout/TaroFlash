import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { useDraft } from '@/composables/draft'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// `mockDecksData` uses a plain `{ value }` box rather than `ref()` — vi.hoisted
// runs before the `vue` import is evaluated, so `ref` isn't available inside it.

const { mockUpsertMutateAsync, mockDeleteMutateAsync, mockSavePacingMutateAsync } = vi.hoisted(
  () => ({
    mockUpsertMutateAsync: vi.fn(),
    mockDeleteMutateAsync: vi.fn(),
    mockSavePacingMutateAsync: vi.fn()
  })
)
const { mockDecksData } = vi.hoisted(() => ({ mockDecksData: { value: [] } }))
const { mockAlert } = vi.hoisted(() => ({ mockAlert: { warn: vi.fn() } }))
const { mockPrompt } = vi.hoisted(() => ({ mockPrompt: { ask: vi.fn() } }))
const { mockNotice } = vi.hoisted(() => ({ mockNotice: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/api/review-pacing', () => ({
  useUpsertPresetMutation: () => ({ mutateAsync: mockUpsertMutateAsync }),
  useDeletePresetMutation: () => ({ mutateAsync: mockDeleteMutateAsync }),
  useSaveDeckPacingMutation: () => ({ mutateAsync: mockSavePacingMutateAsync })
}))
vi.mock('@/api/decks', () => ({ useMemberDecksQuery: () => ({ data: mockDecksData }) }))
vi.mock('@/composables/alert', () => ({ useAlert: () => mockAlert }))
vi.mock('@/composables/prompt', () => ({ usePrompt: () => mockPrompt }))
vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
const { mockT } = vi.hoisted(() => ({ mockT: vi.fn((key) => key) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: mockT }) }))

import { usePresetActions } from '@/views/deck/deck-settings/tab-review-pacing/use-preset-actions'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SYSTEM_PRESET = { id: 1, name: 'Recommended', is_system: true }
const MEMBER_PRESET = { id: 2, name: 'Aggressive', is_system: false }
const DECK = { id: 42 }

const RESOLVED_PACING = {
  desired_retention: 0.9,
  learning_steps: ['1m'],
  relearning_steps: ['10m'],
  max_reviews_per_day: 40,
  max_new_per_day: 20,
  leech_threshold: 8,
  max_interval: 365
}

function makePacing({ selected_preset = MEMBER_PRESET, override_count = 0 } = {}) {
  return {
    selected_preset: ref(selected_preset),
    resolved_pacing: ref(RESOLVED_PACING),
    override_count: ref(override_count),
    resetAllOverrides: vi.fn()
  }
}

/** Plain-object draft + a spy `rebase` — enough for tests that don't assert dirty state. */
function makeEditor({ deck = DECK, draft = {}, rebase = vi.fn() } = {}) {
  return {
    deck,
    draft: { review_pacing_preset_id: null, pacing_overrides: {}, ...draft },
    rebase
  }
}

/**
 * A real `useDraft` + a `resetAllOverrides` wired to mutate its
 * `pacing_overrides` — needed to observe the actual partial-rebase behaviour
 * (`is_dirty` clearing for pacing keys while other staged edits stay dirty).
 */
function makeRealEditor({ deck = DECK, base = {} } = {}) {
  const draftApi = useDraft(() => ({
    title: undefined,
    review_pacing_preset_id: null,
    pacing_overrides: {},
    ...base
  }))
  return { editor: { deck, draft: draftApi.state, rebase: draftApi.rebase }, draftApi }
}

function promptResponse(value) {
  mockPrompt.ask.mockReturnValueOnce({ response: Promise.resolve(value) })
}

function confirmResponse(value) {
  mockAlert.warn.mockReturnValueOnce({ response: Promise.resolve(value) })
}

beforeEach(() => {
  mockUpsertMutateAsync.mockReset()
  mockDeleteMutateAsync.mockReset()
  mockSavePacingMutateAsync.mockReset().mockResolvedValue(undefined)
  mockAlert.warn.mockReset()
  mockPrompt.ask.mockReset()
  mockNotice.error.mockReset()
  mockNotice.success.mockReset()
  mockDecksData.value = []
  mockT.mockClear()
})

// ── other_follower_count [obligation] ──────────────────────────────────────────

describe('usePresetActions — other_follower_count [obligation]', () => {
  test('excludes the deck currently being edited — a preset followed by the edited deck plus one other reports 1, not 2 [obligation]', async () => {
    mockDecksData.value = [
      { id: 42, review_pacing_preset_id: 2 },
      { id: 99, review_pacing_preset_id: 2 }
    ]
    const pacing = makePacing({ selected_preset: MEMBER_PRESET })
    const editor = makeEditor()
    confirmResponse(false)

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    const t_call = mockT.mock.calls.find(([key]) => key === 'alert.delete-preset.message')
    expect(t_call[1]).toBe(1)
    expect(t_call[2]).toEqual({ named: { name: MEMBER_PRESET.name, count: 1 } })
  })

  test('reports 0 when the preset has no other followers besides the edited deck', async () => {
    mockDecksData.value = [{ id: 42, review_pacing_preset_id: 2 }]
    const pacing = makePacing({ selected_preset: MEMBER_PRESET })
    const editor = makeEditor()
    confirmResponse(false)

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    const t_call = mockT.mock.calls.find(([key]) => key === 'alert.delete-preset.message')
    expect(t_call[1]).toBe(0)
  })
})

// ── onFork ───────────────────────────────────────────────────────────────────

describe('usePresetActions — onFork', () => {
  test('bails without writing when the prompt is cancelled (undefined) [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse(undefined)

    const { onFork } = usePresetActions(pacing, editor)
    await onFork()

    expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
    expect(editor.draft.review_pacing_preset_id).toBeNull()
  })

  test('on success sets draft.review_pacing_preset_id to the newly created preset id and clears every override [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { pacing_overrides: { desired_retention: 0.8 } } })
    promptResponse('My Fork')
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 7, name: 'My Fork' })

    const { onFork } = usePresetActions(pacing, editor)
    await onFork()

    expect(mockUpsertMutateAsync).toHaveBeenCalledWith({ name: 'My Fork', ...RESOLVED_PACING })
    expect(editor.draft.review_pacing_preset_id).toBe(7)
    expect(pacing.resetAllOverrides).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).toHaveBeenCalledTimes(1)
    expect(mockNotice.error).not.toHaveBeenCalled()
  })

  test('carries all seven pacing fields in the create payload, not just name/retention/steps [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse('My Fork')
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 7, name: 'My Fork' })

    const { onFork } = usePresetActions(pacing, editor)
    await onFork()

    const [payload] = mockUpsertMutateAsync.mock.calls[0]
    expect(payload).toMatchObject({
      max_reviews_per_day: RESOLVED_PACING.max_reviews_per_day,
      max_new_per_day: RESOLVED_PACING.max_new_per_day,
      leech_threshold: RESOLVED_PACING.leech_threshold,
      max_interval: RESOLVED_PACING.max_interval
    })
  })

  test('on failure leaves the draft untouched and fires an error notice, does not repoint or clear overrides [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor({
      draft: { review_pacing_preset_id: 2, pacing_overrides: { desired_retention: 0.8 } }
    })
    promptResponse('My Fork')
    mockUpsertMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onFork } = usePresetActions(pacing, editor)
    await onFork()

    expect(editor.draft.review_pacing_preset_id).toBe(2)
    expect(editor.draft.pacing_overrides).toEqual({ desired_retention: 0.8 })
    expect(pacing.resetAllOverrides).not.toHaveBeenCalled()
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
    expect(mockNotice.error).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).not.toHaveBeenCalled()
  })

  test('persists the deck pacing sidecar immediately via save-deck-pacing mutation [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { pacing_overrides: { desired_retention: 0.8 } } })
    promptResponse('My Fork')
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 7, name: 'My Fork' })

    const { onFork } = usePresetActions(pacing, editor)
    await onFork()

    expect(mockSavePacingMutateAsync).toHaveBeenCalledWith({
      deck_id: DECK.id,
      review_pacing_preset_id: 7,
      overrides: editor.draft.pacing_overrides
    })
    expect(editor.rebase).toHaveBeenCalledWith(['review_pacing_preset_id', 'pacing_overrides'])
  })

  test('when the preset write succeeds but the pacing sidecar write fails, fires an error notice and does not rebase', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { pacing_overrides: { desired_retention: 0.8 } } })
    promptResponse('My Fork')
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 7, name: 'My Fork' })
    mockSavePacingMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onFork } = usePresetActions(pacing, editor)
    await onFork()

    expect(editor.rebase).not.toHaveBeenCalled()
    expect(mockNotice.error).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).not.toHaveBeenCalled()
  })
})

// ── onPush ───────────────────────────────────────────────────────────────────

describe('usePresetActions — onPush', () => {
  test('is a no-op when the selected preset is_system — no mutation, no alert [obligation]', async () => {
    const pacing = makePacing({ selected_preset: SYSTEM_PRESET })
    const editor = makeEditor()

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(mockAlert.warn).not.toHaveBeenCalled()
    expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
  })

  test('bails without writing when the confirm is cancelled', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    confirmResponse(false)

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
  })

  test('on success clears every override, so the deck no longer diverges from the preset it just wrote [obligation]', async () => {
    const pacing = makePacing({ override_count: 2 })
    const editor = makeEditor({
      draft: { pacing_overrides: { desired_retention: 0.8, max_reviews_per_day: 10 } }
    })
    confirmResponse(true)
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 2, name: 'Aggressive' })

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(mockUpsertMutateAsync).toHaveBeenCalledWith({
      id: MEMBER_PRESET.id,
      name: MEMBER_PRESET.name,
      ...RESOLVED_PACING
    })
    expect(pacing.resetAllOverrides).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).toHaveBeenCalledTimes(1)
  })

  test('on failure leaves the draft untouched and fires an error notice [obligation]', async () => {
    const pacing = makePacing({ override_count: 1 })
    const editor = makeEditor({ draft: { pacing_overrides: { desired_retention: 0.8 } } })
    confirmResponse(true)
    mockUpsertMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(editor.draft.pacing_overrides).toEqual({ desired_retention: 0.8 })
    expect(pacing.resetAllOverrides).not.toHaveBeenCalled()
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
    expect(mockNotice.error).toHaveBeenCalledTimes(1)
  })

  test('persists the deck pacing sidecar immediately via save-deck-pacing mutation [obligation]', async () => {
    const pacing = makePacing({ override_count: 1 })
    const editor = makeEditor({ draft: { pacing_overrides: { desired_retention: 0.8 } } })
    confirmResponse(true)
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 2, name: 'Aggressive' })

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(mockSavePacingMutateAsync).toHaveBeenCalledWith({
      deck_id: DECK.id,
      review_pacing_preset_id: null,
      overrides: editor.draft.pacing_overrides
    })
    expect(editor.rebase).toHaveBeenCalledWith(['review_pacing_preset_id', 'pacing_overrides'])
  })

  test('when the preset write succeeds but the pacing sidecar write fails, fires an error notice and does not rebase', async () => {
    const pacing = makePacing({ override_count: 1 })
    const editor = makeEditor({ draft: { pacing_overrides: { desired_retention: 0.8 } } })
    confirmResponse(true)
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 2, name: 'Aggressive' })
    mockSavePacingMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(editor.rebase).not.toHaveBeenCalled()
    expect(mockNotice.error).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).not.toHaveBeenCalled()
  })

  test('after a successful push, the draft is no longer dirty w.r.t. pacing while unrelated staged edits stay dirty [obligation]', async () => {
    const { editor, draftApi } = makeRealEditor({ base: { title: 'Original' } })
    editor.draft.title = 'Edited title'
    editor.draft.pacing_overrides.desired_retention = 0.8

    const pacing = makePacing({ override_count: 1 })
    pacing.resetAllOverrides = vi.fn(() => {
      for (const key of Object.keys(editor.draft.pacing_overrides)) {
        delete editor.draft.pacing_overrides[key]
      }
    })
    confirmResponse(true)
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 2, name: 'Aggressive' })

    const { onPush } = usePresetActions(pacing, editor)
    await onPush()

    expect(editor.draft.pacing_overrides).toEqual({})
    expect(draftApi.is_dirty.value).toBe(true)
    expect(editor.draft.title).toBe('Edited title')
  })
})

// ── onRename ─────────────────────────────────────────────────────────────────

describe('usePresetActions — onRename', () => {
  test('is a no-op when the selected preset is_system [obligation]', async () => {
    const pacing = makePacing({ selected_preset: SYSTEM_PRESET })
    const editor = makeEditor()

    const { onRename } = usePresetActions(pacing, editor)
    await onRename()

    expect(mockPrompt.ask).not.toHaveBeenCalled()
    expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
  })

  test('bails without mutating when the prompt is cancelled (undefined) [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse(undefined)

    const { onRename } = usePresetActions(pacing, editor)
    await onRename()

    expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
  })

  test('bails without mutating when the returned name is unchanged [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse(MEMBER_PRESET.name)

    const { onRename } = usePresetActions(pacing, editor)
    await onRename()

    expect(mockUpsertMutateAsync).not.toHaveBeenCalled()
  })

  test('on success writes the new name with the resolved pacing payload', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse('Renamed')
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 2, name: 'Renamed' })

    const { onRename } = usePresetActions(pacing, editor)
    await onRename()

    expect(mockUpsertMutateAsync).toHaveBeenCalledWith({
      id: MEMBER_PRESET.id,
      name: 'Renamed',
      ...RESOLVED_PACING
    })
    expect(mockNotice.success).toHaveBeenCalledTimes(1)
  })

  test('on failure fires an error notice and does not throw', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse('Renamed')
    mockUpsertMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onRename } = usePresetActions(pacing, editor)
    await onRename()

    expect(mockNotice.error).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).not.toHaveBeenCalled()
  })

  test('never calls the save-deck-pacing mutation — it only renames the preset, never touches the deck link or overrides [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse('Renamed')
    mockUpsertMutateAsync.mockResolvedValueOnce({ id: 2, name: 'Renamed' })

    const { onRename } = usePresetActions(pacing, editor)
    await onRename()

    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
    expect(editor.rebase).not.toHaveBeenCalled()
  })
})

// ── onDelete ─────────────────────────────────────────────────────────────────

describe('usePresetActions — onDelete', () => {
  test('is a no-op when the selected preset is_system — no mutation, no alert [obligation]', async () => {
    const pacing = makePacing({ selected_preset: SYSTEM_PRESET })
    const editor = makeEditor()

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    expect(mockAlert.warn).not.toHaveBeenCalled()
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled()
  })

  test('bails without mutating when the confirm is cancelled', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    confirmResponse(false)

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    expect(mockDeleteMutateAsync).not.toHaveBeenCalled()
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
  })

  test('on success sets draft.review_pacing_preset_id to null, mirroring the FK ON DELETE SET NULL [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { review_pacing_preset_id: 2 } })
    confirmResponse(true)
    mockDeleteMutateAsync.mockResolvedValueOnce(undefined)

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith(MEMBER_PRESET.id)
    expect(editor.draft.review_pacing_preset_id).toBeNull()
    expect(mockNotice.success).toHaveBeenCalledTimes(1)
  })

  test('on failure leaves the draft untouched and fires an error notice, does not null the preset id [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { review_pacing_preset_id: 2 } })
    confirmResponse(true)
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    expect(editor.draft.review_pacing_preset_id).toBe(2)
    expect(mockSavePacingMutateAsync).not.toHaveBeenCalled()
    expect(mockNotice.error).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).not.toHaveBeenCalled()
  })

  test('persists the deck pacing sidecar immediately via save-deck-pacing mutation [obligation]', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { review_pacing_preset_id: 2 } })
    confirmResponse(true)
    mockDeleteMutateAsync.mockResolvedValueOnce(undefined)

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    expect(mockSavePacingMutateAsync).toHaveBeenCalledWith({
      deck_id: DECK.id,
      review_pacing_preset_id: null,
      overrides: editor.draft.pacing_overrides
    })
    expect(editor.rebase).toHaveBeenCalledWith(['review_pacing_preset_id', 'pacing_overrides'])
  })

  test('when the delete succeeds but the pacing sidecar write fails, fires an error notice and does not rebase', async () => {
    const pacing = makePacing()
    const editor = makeEditor({ draft: { review_pacing_preset_id: 2 } })
    confirmResponse(true)
    mockDeleteMutateAsync.mockResolvedValueOnce(undefined)
    mockSavePacingMutateAsync.mockRejectedValueOnce(new Error('boom'))

    const { onDelete } = usePresetActions(pacing, editor)
    await onDelete()

    expect(editor.rebase).not.toHaveBeenCalled()
    expect(mockNotice.error).toHaveBeenCalledTimes(1)
    expect(mockNotice.success).not.toHaveBeenCalled()
  })
})

// ── busy flag ────────────────────────────────────────────────────────────────

describe('usePresetActions — busy', () => {
  test('is true while a write is in flight and false again once it settles', async () => {
    const pacing = makePacing()
    const editor = makeEditor()
    promptResponse('My Fork')
    let resolveWrite
    mockUpsertMutateAsync.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveWrite = resolve
      })
    )

    const { onFork, busy } = usePresetActions(pacing, editor)
    expect(busy.value).toBe(false)

    const promise = onFork()
    await Promise.resolve()
    expect(busy.value).toBe(true)

    resolveWrite({ id: 7, name: 'My Fork' })
    await promise

    expect(busy.value).toBe(false)
  })
})

// ── is_system_preset / has_overrides ────────────────────────────────────────

describe('usePresetActions — derived flags', () => {
  test('is_system_preset reflects the selected preset', () => {
    const pacing = makePacing({ selected_preset: SYSTEM_PRESET })
    const { is_system_preset } = usePresetActions(pacing, makeEditor())
    expect(is_system_preset.value).toBe(true)
  })

  test('is_system_preset is false when no preset is selected', () => {
    const pacing = makePacing({ selected_preset: undefined })
    const { is_system_preset } = usePresetActions(pacing, makeEditor())
    expect(is_system_preset.value).toBe(false)
  })

  test('has_overrides is true when override_count > 0', () => {
    const pacing = makePacing({ override_count: 1 })
    const { has_overrides } = usePresetActions(pacing, makeEditor())
    expect(has_overrides.value).toBe(true)
  })

  test('has_overrides is false when override_count is 0', () => {
    const pacing = makePacing({ override_count: 0 })
    const { has_overrides } = usePresetActions(pacing, makeEditor())
    expect(has_overrides.value).toBe(false)
  })
})
