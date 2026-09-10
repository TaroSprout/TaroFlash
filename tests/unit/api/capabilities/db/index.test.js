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

import { fetchCapabilitySwitches } from '@/api/capabilities/db'

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  loggerMock.error.mockClear()
  fromMock.mockReturnValue({ select: selectMock })
})

describe('fetchCapabilitySwitches', () => {
  test('selects key, state from capability_switches', async () => {
    selectMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchCapabilitySwitches()

    expect(fromMock).toHaveBeenCalledWith('capability_switches')
    expect(selectMock).toHaveBeenCalledWith('key, state')
  })

  test('returns the switch rows', async () => {
    const rows = [{ key: 'audio_reader', state: 'on' }]
    selectMock.mockResolvedValueOnce({ data: rows, error: null })

    const result = await fetchCapabilitySwitches()

    expect(result).toEqual(rows)
  })

  test('returns an empty array when data is null', async () => {
    selectMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchCapabilitySwitches()

    expect(result).toEqual([])
  })

  test('logs and throws on a read error', async () => {
    const error = new Error('boom')
    selectMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchCapabilitySwitches()).rejects.toThrow('boom')
    expect(loggerMock.error).toHaveBeenCalledWith('boom')
  })
})
