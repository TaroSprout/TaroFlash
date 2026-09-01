import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { useReviewSaver } from '@/views/study-session/composables/review-saver'

// ── Hoisted mock: the underlying save mutation ────────────────────────────────

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({ mutateAsync })
}))

const vars = { card_id: 1, deck_id: 1, card: {}, log: {} }

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

beforeEach(() => {
  mutateAsync.mockReset()
  setOnline(true)
})

afterEach(() => {
  vi.useRealTimers()
  setOnline(true)
})

describe('useReviewSaver', () => {
  test('resolves "saved" on the first attempt when the save succeeds, with no retries', async () => {
    mutateAsync.mockResolvedValueOnce(undefined)
    const { save } = useReviewSaver()

    await expect(save(vars)).resolves.toBe('saved')
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith(vars)
  })

  test('retries a failing save at 0.5s / 1s / 2s and resolves "saved" when a retry succeeds', async () => {
    vi.useFakeTimers()
    mutateAsync
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined)

    const { save } = useReviewSaver()
    const p = save(vars)

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)

    await expect(p).resolves.toBe('saved')
    // Initial attempt + 3 timed retries.
    expect(mutateAsync).toHaveBeenCalledTimes(4)
  })

  test('makes one more attempt when the browser fires "online" after the timed retries are exhausted', async () => {
    vi.useFakeTimers()
    setOnline(false)
    mutateAsync.mockRejectedValue(new Error('offline'))

    const { save } = useReviewSaver()
    const p = save(vars)

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)

    // Still offline — 4 attempts made, now waiting for reconnection.
    expect(mutateAsync).toHaveBeenCalledTimes(4)

    // Reconnect and let the final attempt succeed.
    mutateAsync.mockResolvedValueOnce(undefined)
    setOnline(true)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)

    await expect(p).resolves.toBe('saved')
    expect(mutateAsync).toHaveBeenCalledTimes(5)
  })

  test('resolves "failed" after the timed retries and the online attempt all fail', async () => {
    vi.useFakeTimers()
    mutateAsync.mockRejectedValue(new Error('boom'))

    const { save } = useReviewSaver()
    const p = save(vars)

    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    // Already online, so the final online-gated attempt fires immediately.
    await vi.advanceTimersByTimeAsync(0)

    await expect(p).resolves.toBe('failed')
    // Initial + 3 timed + 1 online-gated.
    expect(mutateAsync).toHaveBeenCalledTimes(5)
  })
})
