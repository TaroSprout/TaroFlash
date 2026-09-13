import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const {
  capabilitiesSelectMock,
  updateMock,
  eqMock,
  grantsInsertMock,
  grantsDeleteMock,
  grantsDeleteEqMock,
  fromMock,
  rpcMock,
  loggerMock
} = vi.hoisted(() => ({
  capabilitiesSelectMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  grantsInsertMock: vi.fn(),
  grantsDeleteMock: vi.fn(),
  grantsDeleteEqMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  loggerMock: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock, rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

import {
  fetchCapabilities,
  fetchResolvedCapabilities,
  updateCapability,
  fetchCapabilityGrants,
  addCapabilityGrant,
  removeCapabilityGrant
} from '@/api/capabilities/db'

beforeEach(() => {
  fromMock.mockReset()
  rpcMock.mockReset()
  capabilitiesSelectMock.mockReset()
  updateMock.mockReset()
  eqMock.mockReset()
  grantsInsertMock.mockReset()
  grantsDeleteMock.mockReset()
  grantsDeleteEqMock.mockReset()
  loggerMock.error.mockClear()
  fromMock.mockImplementation((table) => {
    if (table === 'capabilities') return { select: capabilitiesSelectMock, update: updateMock }
    if (table === 'capability_grants') return { insert: grantsInsertMock, delete: grantsDeleteMock }
    throw new Error(`unexpected table: ${table}`)
  })
  updateMock.mockReturnValue({ eq: eqMock })
  grantsDeleteMock.mockReturnValue({ eq: grantsDeleteEqMock })
  grantsDeleteEqMock.mockReturnValue({ eq: vi.fn() })
})

describe('fetchCapabilities', () => {
  test('selects only key, state from capabilities, never capability_grants', async () => {
    capabilitiesSelectMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchCapabilities()

    expect(fromMock).toHaveBeenCalledWith('capabilities')
    expect(fromMock).not.toHaveBeenCalledWith('capability_grants')
    expect(capabilitiesSelectMock).toHaveBeenCalledWith('key, state')
  })

  test('returns the rows as capabilities, with no grantedKeys field', async () => {
    const rows = [
      { key: 'audio_reader', state: 'targeted' },
      { key: 'other_capability', state: 'off' }
    ]
    capabilitiesSelectMock.mockResolvedValueOnce({ data: rows, error: null })

    const result = await fetchCapabilities()

    expect(result).toEqual({ capabilities: rows })
    expect(result).not.toHaveProperty('grantedKeys')
  })

  test('returns empty capabilities when the read is null', async () => {
    capabilitiesSelectMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchCapabilities()

    expect(result).toEqual({ capabilities: [] })
  })

  test('logs and throws on a read error', async () => {
    const error = new Error('boom')
    capabilitiesSelectMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchCapabilities()).rejects.toThrow('boom')
    expect(loggerMock.error).toHaveBeenCalledWith('boom')
  })
})

describe('fetchResolvedCapabilities', () => {
  test('calls resolve_member_capabilities', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchResolvedCapabilities()

    expect(rpcMock).toHaveBeenCalledWith('resolve_member_capabilities')
  })

  test('returns the rpc rows as-is', async () => {
    const rows = [{ key: 'audio_reader', live: true }]
    rpcMock.mockResolvedValueOnce({ data: rows, error: null })

    const result = await fetchResolvedCapabilities()

    expect(result).toEqual(rows)
  })

  test('returns an empty list when the rpc data is null', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchResolvedCapabilities()

    expect(result).toEqual([])
  })

  test('logs and throws on an rpc error', async () => {
    const error = new Error('resolve refused')
    rpcMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchResolvedCapabilities()).rejects.toThrow('resolve refused')
    expect(loggerMock.error).toHaveBeenCalledWith('resolve refused')
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

describe('fetchCapabilityGrants', () => {
  test('calls list_capability_grants with the key', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchCapabilityGrants('audio_reader')

    expect(rpcMock).toHaveBeenCalledWith('list_capability_grants', { p_key: 'audio_reader' })
  })

  test('returns an empty list when the rpc data is null', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchCapabilityGrants('audio_reader')

    expect(result).toEqual([])
  })

  test('logs and throws on an rpc error', async () => {
    const error = new Error('grants refused')
    rpcMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchCapabilityGrants('audio_reader')).rejects.toThrow('grants refused')
    expect(loggerMock.error).toHaveBeenCalledWith('grants refused')
  })
})

describe('addCapabilityGrant', () => {
  test('inserts key and member_id into capability_grants', async () => {
    grantsInsertMock.mockResolvedValueOnce({ error: null })

    await addCapabilityGrant({ key: 'audio_reader', member_id: 'member-123' })

    expect(fromMock).toHaveBeenCalledWith('capability_grants')
    expect(grantsInsertMock).toHaveBeenCalledWith({
      key: 'audio_reader',
      member_id: 'member-123'
    })
  })

  test('logs and throws on a write error', async () => {
    const error = new Error('insert refused')
    grantsInsertMock.mockResolvedValueOnce({ error })

    await expect(
      addCapabilityGrant({ key: 'audio_reader', member_id: 'member-123' })
    ).rejects.toThrow('insert refused')
    expect(loggerMock.error).toHaveBeenCalledWith('insert refused')
  })
})

describe('removeCapabilityGrant', () => {
  test('deletes the row matching key and member_id', async () => {
    const secondEqMock = vi.fn().mockResolvedValueOnce({ error: null })
    grantsDeleteEqMock.mockReturnValueOnce({ eq: secondEqMock })

    await removeCapabilityGrant({ key: 'audio_reader', member_id: 'member-123' })

    expect(fromMock).toHaveBeenCalledWith('capability_grants')
    expect(grantsDeleteEqMock).toHaveBeenCalledWith('key', 'audio_reader')
    expect(secondEqMock).toHaveBeenCalledWith('member_id', 'member-123')
  })

  test('logs and throws on a write error', async () => {
    const error = new Error('delete refused')
    const secondEqMock = vi.fn().mockResolvedValueOnce({ error })
    grantsDeleteEqMock.mockReturnValueOnce({ eq: secondEqMock })

    await expect(
      removeCapabilityGrant({ key: 'audio_reader', member_id: 'member-123' })
    ).rejects.toThrow('delete refused')
    expect(loggerMock.error).toHaveBeenCalledWith('delete refused')
  })
})
