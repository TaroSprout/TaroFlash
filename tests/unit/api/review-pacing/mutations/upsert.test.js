import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { useMutationSpy, createPresetMock, updatePresetMock, invalidateSpy } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  createPresetMock: vi.fn(),
  updatePresetMock: vi.fn(),
  invalidateSpy: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/review-pacing/db', () => ({
  createPreset: createPresetMock,
  updatePreset: updatePresetMock
}))

import { useUpsertPresetMutation } from '@/api/review-pacing/mutations/upsert'

beforeEach(() => {
  useMutationSpy.mockClear()
  createPresetMock.mockClear()
  updatePresetMock.mockClear()
  invalidateSpy.mockClear()
})

function config() {
  useUpsertPresetMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useUpsertPresetMutation — mutation()', () => {
  test('calls createPreset when no id is present', async () => {
    const { mutation } = config()
    const params = {
      name: 'Custom',
      desired_retention: 0.9,
      learning_steps: ['1m'],
      relearning_steps: ['10m']
    }
    await mutation(params)
    expect(createPresetMock).toHaveBeenCalledWith(params)
    expect(updatePresetMock).not.toHaveBeenCalled()
  })

  test('calls updatePreset when an id is present', async () => {
    const { mutation } = config()
    const params = {
      id: 5,
      name: 'Renamed',
      desired_retention: 0.9,
      learning_steps: ['1m'],
      relearning_steps: ['10m']
    }
    await mutation(params)
    const { id, ...preset } = params
    expect(updatePresetMock).toHaveBeenCalledWith({ id, ...preset })
    expect(createPresetMock).not.toHaveBeenCalled()
  })
})

describe('useUpsertPresetMutation — onSettled()', () => {
  test('invalidates the review-pacing-presets query on settle', () => {
    const { onSettled } = config()
    onSettled()
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['review-pacing-presets'] })
  })

  test('invalidates the review-pacing-presets query on settle after an error [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'))
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['review-pacing-presets'] })
  })

  test('also invalidates the decks query on settle — editing a preset re-paces every deck following it [obligation]', () => {
    const { onSettled } = config()
    onSettled()
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })

  test('also invalidates the decks query on settle after an error [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'))
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  })
})
