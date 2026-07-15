import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { useMutationSpy, submitFeedbackMock, invalidateSpy } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  submitFeedbackMock: vi.fn(),
  invalidateSpy: vi.fn()
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/feedback/db', () => ({ submitFeedback: submitFeedbackMock }))

import { useSubmitFeedbackMutation } from '@/api/feedback/mutations/submit'

beforeEach(() => {
  useMutationSpy.mockClear()
  submitFeedbackMock.mockClear()
  invalidateSpy.mockClear()
})

function config() {
  useSubmitFeedbackMutation()
  return useMutationSpy.mock.calls.at(-1)[0]
}

describe('useSubmitFeedbackMutation — mutation()', () => {
  test('calls submitFeedback with the mutation params', async () => {
    const { mutation } = config()
    const params = { title: 'Title', body: 'Body', type: 'idea' }
    await mutation(params)
    expect(submitFeedbackMock).toHaveBeenCalledWith(params)
  })
})

describe('useSubmitFeedbackMutation — onSettled()', () => {
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
