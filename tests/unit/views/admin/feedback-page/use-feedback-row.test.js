import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { nextTick, ref } from 'vue'

const { mockNotice, mutateAsyncMock } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn() },
  mutateAsyncMock: vi.fn()
}))

vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
vi.mock('@/api/feedback', () => ({
  useUpdateFeedbackItemMutation: () => ({ mutateAsync: mutateAsyncMock })
}))

import { useFeedbackRow, STATUS_ORDER } from '@/views/admin/feedback-page/use-feedback-row'

function makeItem(overrides = {}) {
  return ref({
    id: 5,
    visibility: 'public',
    status: 'new',
    ...overrides
  })
}

beforeEach(() => {
  mockNotice.error.mockReset()
  mutateAsyncMock.mockReset()
})

describe('useFeedbackRow — initial state', () => {
  test('published mirrors visibility === public', () => {
    const { published } = useFeedbackRow(makeItem({ visibility: 'public' }))
    expect(published.value).toBe(true)
  })

  test('published is false for internal visibility', () => {
    const { published } = useFeedbackRow(makeItem({ visibility: 'internal' }))
    expect(published.value).toBe(false)
  })

  test('status mirrors item.status', () => {
    const { status } = useFeedbackRow(makeItem({ status: 'accepted' }))
    expect(status.value).toBe('accepted')
  })

  test('status_options is built from STATUS_ORDER', () => {
    const { status_options } = useFeedbackRow(makeItem())
    expect(status_options.value.map((o) => o.value)).toEqual(STATUS_ORDER)
  })
})

describe('useFeedbackRow — onPublishedChange', () => {
  test('commits optimistically before the write resolves', () => {
    mutateAsyncMock.mockReturnValue(new Promise(() => {}))
    const { published, onPublishedChange } = useFeedbackRow(makeItem({ visibility: 'internal' }))

    onPublishedChange(true)

    expect(published.value).toBe(true)
  })

  test('sends both the new visibility and the current status in one call', async () => {
    mutateAsyncMock.mockResolvedValue({})
    const { onPublishedChange } = useFeedbackRow(
      makeItem({ id: 7, visibility: 'internal', status: 'accepted' })
    )

    await onPublishedChange(true)

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      feedback_id: 7,
      status: 'accepted',
      visibility: 'public'
    })
  })

  test('on failure, reverts published to its prior value and shows the error toast', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('boom'))
    const { published, onPublishedChange } = useFeedbackRow(makeItem({ visibility: 'internal' }))

    await onPublishedChange(true)

    expect(published.value).toBe(false)
    expect(mockNotice.error).toHaveBeenCalledWith('toast.error.admin-feedback-update-failed')
  })

  test('a failed Published toggle leaves status untouched', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('boom'))
    const { status, onPublishedChange } = useFeedbackRow(
      makeItem({ visibility: 'internal', status: 'accepted' })
    )

    await onPublishedChange(true)

    expect(status.value).toBe('accepted')
  })
})

describe('useFeedbackRow — onStatusChange', () => {
  test('commits optimistically before the write resolves', () => {
    mutateAsyncMock.mockReturnValue(new Promise(() => {}))
    const { status, onStatusChange } = useFeedbackRow(makeItem({ status: 'new' }))

    onStatusChange('done')

    expect(status.value).toBe('done')
  })

  test('sends both the new status and the current visibility in one call', async () => {
    mutateAsyncMock.mockResolvedValue({})
    const { onStatusChange } = useFeedbackRow(
      makeItem({ id: 9, visibility: 'public', status: 'new' })
    )

    await onStatusChange('done')

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      feedback_id: 9,
      status: 'done',
      visibility: 'public'
    })
  })

  test('on failure, reverts status to its prior value and shows the error toast', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('boom'))
    const { status, onStatusChange } = useFeedbackRow(makeItem({ status: 'new' }))

    await onStatusChange('done')

    expect(status.value).toBe('new')
    expect(mockNotice.error).toHaveBeenCalledWith('toast.error.admin-feedback-update-failed')
  })

  test('a failed status change leaves the Published value untouched', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('boom'))
    const { published, onStatusChange } = useFeedbackRow(
      makeItem({ visibility: 'public', status: 'new' })
    )

    await onStatusChange('done')

    expect(published.value).toBe(true)
  })
})

describe('useFeedbackRow — item prop changes', () => {
  test('published and status re-sync when the underlying item updates', async () => {
    const item = makeItem({ visibility: 'internal', status: 'new' })
    const { published, status } = useFeedbackRow(item)

    item.value = { ...item.value, visibility: 'public', status: 'done' }
    await nextTick()

    expect(published.value).toBe(true)
    expect(status.value).toBe('done')
  })
})
