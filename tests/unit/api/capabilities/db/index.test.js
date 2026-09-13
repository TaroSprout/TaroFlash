import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const {
  selectMock,
  updateMock,
  eqMock,
  fromMock,
  rpcMock,
  insertMock,
  deleteMock,
  deleteEqMock,
  loggerMock
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  insertMock: vi.fn(),
  deleteMock: vi.fn(),
  deleteEqMock: vi.fn(),
  loggerMock: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}))

vi.mock('@/supabase-client', () => ({
  supabase: { from: fromMock, rpc: rpcMock }
}))

vi.mock('@/utils/logger', () => ({ default: loggerMock }))

import {
  fetchCapabilities,
  updateCapability,
  fetchCapabilityGrants,
  addCapabilityGrant,
  removeCapabilityGrant
} from '@/api/capabilities/db'

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  updateMock.mockReset()
  eqMock.mockReset()
  rpcMock.mockReset()
  insertMock.mockReset()
  deleteMock.mockReset()
  deleteEqMock.mockReset()
  loggerMock.error.mockClear()
  fromMock.mockReturnValue({
    select: selectMock,
    update: updateMock,
    insert: insertMock,
    delete: deleteMock
  })
  updateMock.mockReturnValue({ eq: eqMock })
  deleteMock.mockReturnValue({ eq: () => ({ eq: deleteEqMock }) })
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
  test('reads through the list_capability_grants rpc', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })

    await fetchCapabilityGrants('audio_reader')

    expect(rpcMock).toHaveBeenCalledWith('list_capability_grants', { p_key: 'audio_reader' })
  })

  test('returns the granted rows', async () => {
    const rows = [
      { id: 'member-1', display_name: 'Gina', avatar_url: null, granted_at: '2026-01-01' }
    ]
    rpcMock.mockResolvedValueOnce({ data: rows, error: null })

    const result = await fetchCapabilityGrants('audio_reader')

    expect(result).toEqual(rows)
  })

  test('returns an empty array when data is null', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })

    const result = await fetchCapabilityGrants('audio_reader')

    expect(result).toEqual([])
  })

  test('logs and throws on a read error', async () => {
    const error = new Error('refused')
    rpcMock.mockResolvedValueOnce({ data: null, error })

    await expect(fetchCapabilityGrants('audio_reader')).rejects.toThrow('refused')
    expect(loggerMock.error).toHaveBeenCalledWith('refused')
  })
})

describe('addCapabilityGrant', () => {
  test('inserts the key and member_id', async () => {
    insertMock.mockResolvedValueOnce({ error: null })

    await addCapabilityGrant({ key: 'audio_reader', member_id: 'member-1' })

    expect(fromMock).toHaveBeenCalledWith('capability_grants')
    expect(insertMock).toHaveBeenCalledWith({ key: 'audio_reader', member_id: 'member-1' })
  })

  test('logs and throws on a write error', async () => {
    const error = new Error('refused')
    insertMock.mockResolvedValueOnce({ error })

    await expect(
      addCapabilityGrant({ key: 'audio_reader', member_id: 'member-1' })
    ).rejects.toThrow('refused')
    expect(loggerMock.error).toHaveBeenCalledWith('refused')
  })
})

describe('removeCapabilityGrant', () => {
  test('deletes by key and member_id', async () => {
    deleteEqMock.mockResolvedValueOnce({ error: null })

    await removeCapabilityGrant({ key: 'audio_reader', member_id: 'member-1' })

    expect(fromMock).toHaveBeenCalledWith('capability_grants')
    expect(deleteMock).toHaveBeenCalled()
  })

  test('logs and throws on a write error', async () => {
    const error = new Error('refused')
    deleteEqMock.mockResolvedValueOnce({ error })

    await expect(
      removeCapabilityGrant({ key: 'audio_reader', member_id: 'member-1' })
    ).rejects.toThrow('refused')
    expect(loggerMock.error).toHaveBeenCalledWith('refused')
  })
})
