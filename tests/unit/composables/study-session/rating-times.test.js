import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { Rating } from 'ts-fsrs'
import { useRatingTimes } from '@/views/study-session/composables/rating-times'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// useRatingTimes wraps useRatingFormat; stub it so the compact/label shapes are
// fully under test control and every call is traceable.

const { mockGetRatingTimeCompact, mockGetRatingTimeFormat } = vi.hoisted(() => ({
  mockGetRatingTimeCompact: vi.fn((grade) => `bare-${grade}`),
  mockGetRatingTimeFormat: vi.fn((grade) => `label-${grade}`)
}))

vi.mock('@/views/study-session/composables/fsrs', () => ({
  useRatingFormat: () => ({
    getRatingTimeCompact: mockGetRatingTimeCompact,
    getRatingTimeFormat: mockGetRatingTimeFormat
  })
}))

const ALL_GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

describe('useRatingTimes', () => {
  beforeEach(() => {
    mockGetRatingTimeCompact.mockClear()
    mockGetRatingTimeFormat.mockClear()
  })

  test('returns a bare and label entry per grade, sourced from getRatingTimeCompact/getRatingTimeFormat', () => {
    const preview = ref({ some: 'record-log' })
    const times = useRatingTimes(preview)

    for (const grade of ALL_GRADES) {
      expect(times.value.bare[grade]).toBe(`bare-${grade}`)
      expect(times.value.label[grade]).toBe(`label-${grade}`)
    }
  })

  test('calls getRatingTimeCompact/getRatingTimeFormat with the grade and the current preview value', () => {
    const preview = ref({ marker: 'preview-a' })
    const times = useRatingTimes(preview)
    void times.value // force evaluation

    expect(mockGetRatingTimeCompact).toHaveBeenCalledWith(Rating.Good, { marker: 'preview-a' })
    expect(mockGetRatingTimeFormat).toHaveBeenCalledWith(Rating.Good, { marker: 'preview-a' })
  })

  // ── Frozen per active card, immune to unrelated re-renders [obligation] ────

  test('recomputes only when the preview identity changes — reading .value repeatedly does not re-invoke the source fns [obligation]', () => {
    const preview = ref({ marker: 'card-1' })
    const times = useRatingTimes(preview)

    void times.value
    void times.value
    void times.value

    // computed() memoizes: 4 grades called once each, not once per read.
    expect(mockGetRatingTimeCompact).toHaveBeenCalledTimes(4)
    expect(mockGetRatingTimeFormat).toHaveBeenCalledTimes(4)
  })

  test('recomputes when the preview identity changes to a new active card [obligation]', () => {
    const preview = ref({ marker: 'card-1' })
    const times = useRatingTimes(preview)
    void times.value
    mockGetRatingTimeCompact.mockClear()
    mockGetRatingTimeFormat.mockClear()

    preview.value = { marker: 'card-2' }
    void times.value

    expect(mockGetRatingTimeCompact).toHaveBeenCalledWith(Rating.Good, { marker: 'card-2' })
    expect(mockGetRatingTimeFormat).toHaveBeenCalledWith(Rating.Good, { marker: 'card-2' })
  })

  test('accepts a getter (MaybeRefOrGetter) as well as a ref', () => {
    let current = { marker: 'via-getter' }
    const times = useRatingTimes(() => current)

    expect(times.value.bare[Rating.Good]).toBe(`bare-${Rating.Good}`)
    expect(mockGetRatingTimeCompact).toHaveBeenCalledWith(Rating.Good, current)
  })

  test('handles an undefined preview (no active card) by passing it straight through', () => {
    const preview = ref(undefined)
    const times = useRatingTimes(preview)
    void times.value

    expect(mockGetRatingTimeCompact).toHaveBeenCalledWith(Rating.Good, undefined)
  })
})
