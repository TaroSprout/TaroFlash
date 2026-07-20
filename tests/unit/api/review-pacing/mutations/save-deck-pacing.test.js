import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, saveDeckPacingMock, invalidateSpy } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  saveDeckPacingMock: vi.fn(),
  invalidateSpy: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/review-pacing/db', () => ({ saveDeckPacing: saveDeckPacingMock }))

import { useSaveDeckPacingMutation } from '@/api/review-pacing/mutations/save-deck-pacing'

beforeEach(() => {
  useMutationSpy.mockClear()
  saveDeckPacingMock.mockClear()
  invalidateSpy.mockClear()
})

function config() {
  useSaveDeckPacingMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useSaveDeckPacingMutation — mutation()', () => {
  test('calls saveDeckPacing with the pacing payload', async () => {
    const { mutation } = config()
    const pacing = {
      deck_id: 42,
      review_pacing_preset_id: 2,
      overrides: { desired_retention: 0.8 }
    }
    await mutation(pacing)
    expect(saveDeckPacingMock).toHaveBeenCalledWith(pacing)
  })
})

describe('useSaveDeckPacingMutation — onSettled()', () => {
  test('invalidates the decks query on settle [obligation]', () => {
    // The deck's pacing values are resolved server-side, so any link/override
    // change restates every one of them — the decks query has to refetch.
    const { onSettled } = config()
    onSettled()
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('invalidates the decks query on settle after an error', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'))
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })
})
