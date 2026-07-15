import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, updateFeedbackItemMock, invalidateSpy } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  updateFeedbackItemMock: vi.fn(),
  invalidateSpy: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/feedback/db', () => ({ updateFeedbackItem: updateFeedbackItemMock }))

import { useUpdateFeedbackItemMutation } from '@/api/feedback/mutations/update-item'

beforeEach(() => {
  useMutationSpy.mockClear()
  updateFeedbackItemMock.mockClear()
  invalidateSpy.mockClear()
})

function config() {
  useUpdateFeedbackItemMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useUpdateFeedbackItemMutation — mutation()', () => {
  test('calls updateFeedbackItem with the mutation params', async () => {
    const { mutation } = config()
    const params = { feedback_id: 5, status: 'accepted', visibility: 'public' }
    await mutation(params)
    expect(updateFeedbackItemMock).toHaveBeenCalledWith(params)
  })
})

describe('useUpdateFeedbackItemMutation — onSettled()', () => {
  test('invalidates the feedback-items query on settle', () => {
    const { onSettled } = config()
    onSettled()
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['feedback-items'] })
  })

  test('invalidates the feedback-items query on settle after an error [obligation]', () => {
    const { onSettled } = config()
    onSettled(undefined, new Error('boom'))
    expect(invalidateSpy).toHaveBeenCalledWith({ key: ['feedback-items'] })
  })
})
