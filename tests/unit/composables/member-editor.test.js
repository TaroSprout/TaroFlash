import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useMemberEditor } from '@/composables/member/editor'

const { mockUpsert, mockIsLoading } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue(undefined),
  mockIsLoading: { value: false }
}))

const { mockMember } = vi.hoisted(() => ({
  mockMember: {
    id: 'member-1',
    display_name: 'Chris',
    description: 'hello',
    email: 'chris@example.com',
    created_at: '2026-01-01T00:00:00Z',
    plan: 'pro',
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }
  }
}))

vi.mock('@/api/members', () => ({
  useUpsertMemberMutation: () => ({
    mutateAsync: mockUpsert,
    isLoading: mockIsLoading
  })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMember
}))

beforeEach(() => {
  mockUpsert.mockClear()
  mockUpsert.mockResolvedValue(undefined)
  Object.assign(mockMember, {
    id: 'member-1',
    display_name: 'Chris',
    description: 'hello',
    email: 'chris@example.com',
    created_at: '2026-01-01T00:00:00Z',
    plan: 'pro',
    preferences: {
      accessibility: { left_hand: false },
      audio: { muted: false, interface_sounds: 5, hover_sounds: 5 },
      study: { show_all_ratings: true }
    },
    cover: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }
  })
})

describe('useMemberEditor', () => {
  test('seeds draft from the member store', () => {
    const editor = useMemberEditor()
    expect(editor.draft.display_name).toBe('Chris')
    expect(editor.draft.description).toBe('hello')
  })

  test('exposes email/created_at/plan as computed projections of the store', () => {
    const editor = useMemberEditor()
    expect(editor.email.value).toBe('chris@example.com')
    expect(editor.created_at.value).toBe('2026-01-01T00:00:00Z')
    expect(editor.plan.value).toBe('pro')
  })

  test('falls back to empty string / "free" when the store fields are missing', () => {
    mockMember.email = undefined
    mockMember.created_at = undefined
    mockMember.plan = undefined
    const editor = useMemberEditor()
    expect(editor.email.value).toBe('')
    expect(editor.created_at.value).toBe('')
    expect(editor.plan.value).toBe('free')
  })

  test('seeds draft.preferences verbatim from the store (already resolved upstream) [obligation]', () => {
    mockMember.preferences = {
      accessibility: { left_hand: true },
      audio: { muted: false, interface_sounds: 2, hover_sounds: 3 },
      study: { show_all_ratings: false }
    }
    const editor = useMemberEditor()
    expect(editor.draft.preferences).toEqual(mockMember.preferences)
  })

  test('seeds draft.cover_config from member_store.cover (persisted value) [obligation]', () => {
    const editor = useMemberEditor()
    expect(editor.draft.cover_config).toEqual({
      theme: 'green-500',
      theme_dark: 'green-800',
      pattern: 'bank-note'
    })
  })

  test('reopening with a previously-saved cover seeds that cover, not hardcoded defaults [obligation]', () => {
    mockMember.cover = { theme: 'red-500', theme_dark: 'red-700', pattern: 'wave' }
    const editor = useMemberEditor()
    expect(editor.draft.cover_config).toEqual({
      theme: 'red-500',
      theme_dark: 'red-700',
      pattern: 'wave'
    })
  })

  test('is_dirty is false when nothing has changed', () => {
    const editor = useMemberEditor()
    expect(editor.is_dirty.value).toBe(false)
  })

  test('is_dirty flips to true when draft.display_name changes', () => {
    const editor = useMemberEditor()
    editor.draft.display_name = 'Other'
    expect(editor.is_dirty.value).toBe(true)
  })

  test('is_dirty flips to true when draft.description changes', () => {
    const editor = useMemberEditor()
    editor.draft.description = 'changed'
    expect(editor.is_dirty.value).toBe(true)
  })

  test('is_dirty flips to true when only draft.cover_config.theme changes, rest untouched [obligation]', () => {
    const editor = useMemberEditor()
    editor.draft.cover_config.theme = 'red-500'
    expect(editor.is_dirty.value).toBe(true)
  })

  test('is_dirty flips to true when only draft.cover_config.theme_dark changes [obligation]', () => {
    const editor = useMemberEditor()
    editor.draft.cover_config.theme_dark = 'red-700'
    expect(editor.is_dirty.value).toBe(true)
  })

  test('is_dirty flips to true when only draft.cover_config.pattern changes [obligation]', () => {
    const editor = useMemberEditor()
    editor.draft.cover_config.pattern = 'wave'
    expect(editor.is_dirty.value).toBe(true)
  })

  test('saveMember is a no-op (false) when nothing has changed', async () => {
    const editor = useMemberEditor()
    const result = await editor.saveMember()
    expect(result).toBe(false)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  test('saveMember is a no-op when the member has no id', async () => {
    mockMember.id = undefined
    const editor = useMemberEditor()
    editor.draft.display_name = 'Other'
    const result = await editor.saveMember()
    expect(result).toBe(false)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  test('saveMember calls the upsert mutation with the member id + draft when dirty', async () => {
    const editor = useMemberEditor()
    editor.draft.display_name = 'Renamed'
    editor.draft.description = 'new desc'
    const result = await editor.saveMember()
    expect(result).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 'member-1',
      display_name: 'Renamed',
      description: 'new desc',
      preferences: {
        accessibility: { left_hand: false },
        audio: { muted: false, interface_sounds: 5, hover_sounds: 5 },
        study: {
          show_all_ratings: true
        }
      },
      cover_config: { theme: 'green-500', theme_dark: 'green-800', pattern: 'bank-note' }
    })
  })

  test('saveMember includes cover_config in the upsert payload when only cover changed [obligation]', async () => {
    const editor = useMemberEditor()
    editor.draft.cover_config.theme = 'red-500'
    const result = await editor.saveMember()
    expect(result).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'member-1',
        cover_config: { theme: 'red-500', theme_dark: 'green-800', pattern: 'bank-note' }
      })
    )
  })

  test('saveMember returns false when the mutation throws', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('boom'))
    const editor = useMemberEditor()
    editor.draft.display_name = 'Renamed'
    const result = await editor.saveMember()
    expect(result).toBe(false)
  })

  test('exposes the mutation isLoading ref as `saving`', () => {
    const editor = useMemberEditor()
    expect(editor.saving).toBe(mockIsLoading)
  })

  test('rebases the draft on a successful save, so is_dirty clears without closing [obligation]', async () => {
    const editor = useMemberEditor()
    editor.draft.display_name = 'Renamed'
    expect(editor.is_dirty.value).toBe(true)

    await editor.saveMember()

    expect(editor.is_dirty.value).toBe(false)
  })

  describe('resetChanges [obligation]', () => {
    test('restores draft to its store-seeded values', () => {
      const editor = useMemberEditor()

      editor.draft.display_name = 'Renamed'
      editor.draft.description = 'changed'
      editor.draft.preferences.accessibility.left_hand = true
      editor.draft.cover_config.theme = 'red-500'

      editor.resetChanges()

      expect(editor.draft.display_name).toBe('Chris')
      expect(editor.draft.description).toBe('hello')
      expect(editor.draft.preferences).toEqual(mockMember.preferences)
      expect(editor.draft.cover_config).toEqual({
        theme: 'green-500',
        theme_dark: 'green-800',
        pattern: 'bank-note'
      })
    })

    test('is_dirty is false again after resetChanges, across display_name/preferences/cover edits [obligation]', () => {
      const editor = useMemberEditor()

      editor.draft.display_name = 'Renamed'
      editor.draft.preferences.study.show_all_ratings = false
      editor.draft.cover_config.theme = 'red-500'
      expect(editor.is_dirty.value).toBe(true)

      editor.resetChanges()

      expect(editor.is_dirty.value).toBe(false)
    })
  })
})
