import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, deletePresetMock, invalidateSpy } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  deletePresetMock: vi.fn(),
  invalidateSpy: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/review-pacing/db', () => ({ deletePreset: deletePresetMock }))

import { useDeletePresetMutation } from '@/api/review-pacing/mutations/delete'

beforeEach(() => {
  useMutationSpy.mockClear()
  deletePresetMock.mockClear()
  invalidateSpy.mockClear()
})

function config() {
  useDeletePresetMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useDeletePresetMutation — mutation()', () => {
  test('calls deletePreset with the preset id', async () => {
    const { mutation } = config()
    await mutation(5)
    expect(deletePresetMock).toHaveBeenCalledWith(5)
  })
})

describe('useDeletePresetMutation — onSettled()', () => {
  test('invalidates both the review-pacing-presets and decks queries [obligation]', () => {
    // Deleting a preset assigned to a deck SET NULLs the deck's FK (see the
    // delete.ts comment) — decks need a refetch too, not just the preset list.
    const { onSettled } = config()
    onSettled()
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['review-pacing-presets'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('invalidates both queries on settle after an error', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'))
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['review-pacing-presets'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })
})
