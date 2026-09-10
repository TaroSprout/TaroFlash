import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { selectMock, updateMock, eqMock, fromMock, loggerMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  fromMock: vi.fn(),
  loggerMock: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

import { fetchCapabilities, updateCapabilitySwitch } from '@/api/capabilities/db'

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  updateMock.mockReset()
  eqMock.mockReset()
  loggerMock.error.mockClear()
  fromMock.mockReturnValue({ select: selectMock, update: updateMock })
  updateMock.mockReturnValue({ eq: eqMock })
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

describe('updateCapabilitySwitch', () => {
  test('updates the state for the given key', async () => {
    eqMock.mockResolvedValueOnce({ error: null })

    await updateCapabilitySwitch({ key: 'audio_reader', state: 'on' })

    expect(fromMock).toHaveBeenCalledWith('capability_switches')
    expect(updateMock).toHaveBeenCalledWith({ state: 'on' })
    expect(eqMock).toHaveBeenCalledWith('key', 'audio_reader')
  })

  test('logs and throws on a write error', async () => {
    const error = new Error('refused')
    eqMock.mockResolvedValueOnce({ error })

    await expect(updateCapabilitySwitch({ key: 'audio_reader', state: 'off' })).rejects.toThrow(
      'refused'
    )
    expect(loggerMock.error).toHaveBeenCalledWith('refused')
  })
})
