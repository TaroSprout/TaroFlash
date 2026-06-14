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
    plan: 'pro'
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
    plan: 'pro'
  })
})

describe('useMemberEditor', () => {
  test('seeds settings from the member store', () => {
    const editor = useMemberEditor()
    expect(editor.settings.display_name).toBe('Chris')
    expect(editor.settings.description).toBe('hello')
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

  test('seeds cover from MEMBER_CARD_COVER_DEFAULTS', () => {
    const editor = useMemberEditor()
    expect(editor.cover).toEqual({
      theme: 'green-500',
      theme_dark: 'green-800',
      pattern: 'bank-note'
    })
  })

  test('is_dirty is false when nothing has changed', () => {
    const editor = useMemberEditor()
    expect(editor.is_dirty.value).toBe(false)
  })

  test('is_dirty flips to true when display_name changes', () => {
    const editor = useMemberEditor()
    editor.settings.display_name = 'Other'
    expect(editor.is_dirty.value).toBe(true)
  })

  test('is_dirty flips to true when description changes', () => {
    const editor = useMemberEditor()
    editor.settings.description = 'changed'
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
    editor.settings.display_name = 'Other'
    const result = await editor.saveMember()
    expect(result).toBe(false)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  test('saveMember calls the upsert mutation with the member id + payload when dirty', async () => {
    const editor = useMemberEditor()
    editor.settings.display_name = 'Renamed'
    editor.settings.description = 'new desc'
    const result = await editor.saveMember()
    expect(result).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 'member-1',
      display_name: 'Renamed',
      description: 'new desc',
      preferences: { accessibility: { left_hand: false } }
    })
  })

  test('saveMember returns false when the mutation throws', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('boom'))
    const editor = useMemberEditor()
    editor.settings.display_name = 'Renamed'
    const result = await editor.saveMember()
    expect(result).toBe(false)
  })

  test('exposes the mutation isLoading ref as `saving`', () => {
    const editor = useMemberEditor()
    expect(editor.saving).toBe(mockIsLoading)
  })
})
