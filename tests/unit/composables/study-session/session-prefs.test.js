import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useSessionPrefs } from '@/views/study-session/composables/session-prefs'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockUpsertMember, mockMemberStore } = vi.hoisted(() => ({
  mockUpsertMember: { mutate: vi.fn() },
  mockMemberStore: {
    id: 'member-1',
    preferences: { study: { show_all_ratings: false } }
  }
}))

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
}))

vi.mock('@/api/members', () => ({
  useUpsertMemberMutation: () => mockUpsertMember
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSessionPrefs [obligation]', () => {
  beforeEach(() => {
    mockUpsertMember.mutate.mockClear()
    mockEmitSfx.mockClear()
    mockMemberStore.id = 'member-1'
    mockMemberStore.preferences = { study: { show_all_ratings: false } }
  })

  test('seeds show_all_ratings from member_store.preferences.study.show_all_ratings [obligation]', () => {
    mockMemberStore.preferences = { study: { show_all_ratings: true } }
    const { show_all_ratings } = useSessionPrefs()
    expect(show_all_ratings.value).toBe(true)
  })

  test('seeds false when the store preference is false', () => {
    mockMemberStore.preferences = { study: { show_all_ratings: false } }
    const { show_all_ratings } = useSessionPrefs()
    expect(show_all_ratings.value).toBe(false)
  })

  test('toggleRatings flips the local ref instantly [obligation]', () => {
    const { show_all_ratings, toggleRatings } = useSessionPrefs()
    expect(show_all_ratings.value).toBe(false)

    toggleRatings()

    expect(show_all_ratings.value).toBe(true)
  })

  test('toggleRatings plays the snappy_button_5 sfx', () => {
    const { toggleRatings } = useSessionPrefs()
    toggleRatings()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('toggleRatings persists via the member upsert with the full preferences object spread [obligation]', () => {
    mockMemberStore.preferences = {
      study: { show_all_ratings: false },
      other_namespace: { some_flag: true }
    }
    const { toggleRatings } = useSessionPrefs()

    toggleRatings()

    expect(mockUpsertMember.mutate).toHaveBeenCalledWith({
      id: 'member-1',
      preferences: {
        other_namespace: { some_flag: true },
        study: { show_all_ratings: true }
      }
    })
  })

  test('toggling twice flips back to the original value and persists both times', () => {
    const { show_all_ratings, toggleRatings } = useSessionPrefs()

    toggleRatings()
    toggleRatings()

    expect(show_all_ratings.value).toBe(false)
    expect(mockUpsertMember.mutate).toHaveBeenCalledTimes(2)
  })

  test('toggleRatings is a no-op upsert when the member store has no id [obligation]', () => {
    mockMemberStore.id = undefined
    const { toggleRatings } = useSessionPrefs()

    toggleRatings()

    expect(mockUpsertMember.mutate).not.toHaveBeenCalled()
  })
})
