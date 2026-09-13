import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { capabilitiesSelectMock, grantsSelectMock, updateMock, eqMock, fromMock, loggerMock } =
  vi.hoisted(() => ({
    capabilitiesSelectMock: vi.fn(),
    grantsSelectMock: vi.fn(),
    updateMock: vi.fn(),
    eqMock: vi.fn(),
    fromMock: vi.fn(),
    loggerMock: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  }))

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock }
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

import { fetchCapabilities, updateCapability } from '@/api/capabilities/db'

beforeEach(() => {
  fromMock.mockReset()
  capabilitiesSelectMock.mockReset()
  grantsSelectMock.mockReset()
  updateMock.mockReset()
  eqMock.mockReset()
  loggerMock.error.mockClear()
  fromMock.mockImplementation((table) => {
    if (table === 'capabilities') return { select: capabilitiesSelectMock, update: updateMock }
    if (table === 'capability_grants') return { select: grantsSelectMock }
    throw new Error(`unexpected table: ${table}`)
  })
  updateMock.mockReturnValue({ eq: eqMock })
})

describe('fetchCapabilities', () => {
  test('selects key, state from capabilities and key from capability_grants', async () => {
    capabilitiesSelectMock.mockResolvedValueOnce({ data: [], error: null })
    grantsSelectMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchCapabilities()

    expect(fromMock).toHaveBeenCalledWith('capabilities')
    expect(fromMock).toHaveBeenCalledWith('capability_grants')
    expect(capabilitiesSelectMock).toHaveBeenCalledWith('key, state')
    expect(grantsSelectMock).toHaveBeenCalledWith('key')
  })

  test('shapes the result as capabilities plus a set of granted keys', async () => {
    const rows = [
      { key: 'audio_reader', state: 'targeted' },
      { key: 'other_capability', state: 'off' }
    ]
    capabilitiesSelectMock.mockResolvedValueOnce({ data: rows, error: null })
    grantsSelectMock.mockResolvedValueOnce({ data: [{ key: 'audio_reader' }], error: null })

    const result = await fetchCapabilities()

    expect(result.capabilities).toEqual(rows)
    expect(result.grantedKeys).toEqual(new Set(['audio_reader']))
  })

  test('returns empty capabilities and an empty granted set when both reads are null', async () => {
    capabilitiesSelectMock.mockResolvedValueOnce({ data: null, error: null })
    grantsSelectMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchCapabilities()

    expect(result.capabilities).toEqual([])
    expect(result.grantedKeys).toEqual(new Set())
  })

  test('logs and throws on a capabilities read error', async () => {
    const error = new Error('boom')
    capabilitiesSelectMock.mockResolvedValueOnce({ data: null, error })
    grantsSelectMock.mockResolvedValueOnce({ data: [], error: null })

    await expect(fetchCapabilities()).rejects.toThrow('boom')
    expect(loggerMock.error).toHaveBeenCalledWith('boom')
  })

  test('logs and throws on a capability_grants read error', async () => {
    const error = new Error('grants refused')
    capabilitiesSelectMock.mockResolvedValueOnce({ data: [], error: null })
    grantsSelectMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchCapabilities()).rejects.toThrow('grants refused')
    expect(loggerMock.error).toHaveBeenCalledWith('grants refused')
  })
})

describe('updateCapability', () => {
  test('updates the state for the given key', async () => {
    eqMock.mockResolvedValueOnce({ error: null })

    await updateCapability({ key: 'audio_reader', state: 'on' })

    expect(fromMock).toHaveBeenCalledWith('capabilities')
    expect(updateMock).toHaveBeenCalledWith({ state: 'on' })
    expect(eqMock).toHaveBeenCalledWith('key', 'audio_reader')
  })

  test('logs and throws on a write error', async () => {
    const error = new Error('refused')
    eqMock.mockResolvedValueOnce({ error })

    await expect(updateCapability({ key: 'audio_reader', state: 'off' })).rejects.toThrow('refused')
    expect(loggerMock.error).toHaveBeenCalledWith('refused')
  })
})
