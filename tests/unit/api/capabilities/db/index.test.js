import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { selectMock, fromMock, loggerMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  loggerMock: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

import { fetchCapabilities } from '@/api/capabilities/db'

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  loggerMock.error.mockClear()
  fromMock.mockReturnValue({ select: selectMock })
})

describe('fetchCapabilities', () => {
  test('selects key, state from capabilities', async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchCapabilities()

    expect(fromMock).toHaveBeenCalledWith('capabilities')
    expect(selectMock).toHaveBeenCalledWith('key, state')
  })

  test('returns the capability rows', async () => {
    const rows = [{ key: 'audio_reader', state: 'on' }]
    selectMock.mockResolvedValueOnce({ data: rows, error: null })

    const result = await fetchCapabilities()

    expect(result).toEqual(rows)
  })

  test('returns an empty array when data is null', async () => {
    selectMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchCapabilities()

    expect(result).toEqual([])
  })

  test('logs and throws on a read error', async () => {
    const error = new Error('boom')
    selectMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchCapabilities()).rejects.toThrow('boom')
    expect(loggerMock.error).toHaveBeenCalledWith('boom')
  })
})
