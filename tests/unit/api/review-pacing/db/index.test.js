import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  orderMock: vi.fn(),
  order2Mock: vi.fn(),
  insertMock: vi.fn(),
  insertSelectMock: vi.fn(),
  insertSingleMock: vi.fn(),
  updateMock: vi.fn(),
  updateEqMock: vi.fn(),
  updateSelectMock: vi.fn(),
  updateSingleMock: vi.fn(),
  deleteMock: vi.fn(),
  deleteEqMock: vi.fn(),
  upsertMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: mocks.selectMock,
      insert: mocks.insertMock,
      update: mocks.updateMock,
      delete: mocks.deleteMock,
      upsert: mocks.upsertMock
    })
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import {
  fetchPresets,
  createPreset,
  updatePreset,
  deletePreset,
  saveDeckPacing
} from '@/api/review-pacing/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

const presetRow = {
  id: 1,
  name: 'Custom',
  is_system: false,
  desired_retention: 0.9,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m']
}

beforeEach(() => {
  mocks.selectMock.mockReset()
  mocks.orderMock.mockReset()
  mocks.order2Mock.mockReset()
  mocks.insertMock.mockReset()
  mocks.insertSelectMock.mockReset()
  mocks.insertSingleMock.mockReset()
  mocks.updateMock.mockReset()
  mocks.updateEqMock.mockReset()
  mocks.updateSelectMock.mockReset()
  mocks.updateSingleMock.mockReset()
  mocks.deleteMock.mockReset()
  mocks.deleteEqMock.mockReset()
  mocks.upsertMock.mockReset()

  mocks.selectMock.mockReturnValue({ order: mocks.orderMock })
  mocks.orderMock.mockReturnValue({ order: mocks.order2Mock })

  mocks.insertMock.mockReturnValue({ select: mocks.insertSelectMock })
  mocks.insertSelectMock.mockReturnValue({ single: mocks.insertSingleMock })

  mocks.updateMock.mockReturnValue({ eq: mocks.updateEqMock })
  mocks.updateEqMock.mockReturnValue({ select: mocks.updateSelectMock })
  mocks.updateSelectMock.mockReturnValue({ single: mocks.updateSingleMock })

  mocks.deleteMock.mockReturnValue({ eq: mocks.deleteEqMock })
})

// ── fetchPresets ────────────────────────────────────────────────────────────────

describe('fetchPresets', () => {
  test('selects *, ordering system presets first then by created_at [obligation]', async () => {
    mocks.order2Mock.mockResolvedValueOnce({ data: [presetRow], error: null })
    await fetchPresets()
    expect(mocks.selectMock).toHaveBeenCalledWith('*')
    expect(mocks.orderMock).toHaveBeenCalledWith('is_system', { ascending: false })
    expect(mocks.order2Mock).toHaveBeenCalledWith('created_at')
  })

  test('returns the rows on success', async () => {
    mocks.order2Mock.mockResolvedValueOnce({ data: [presetRow], error: null })
    await expect(fetchPresets()).resolves.toEqual([presetRow])
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'boom' }
    mocks.order2Mock.mockResolvedValueOnce({ data: null, error: err })
    await expect(fetchPresets()).rejects.toBe(err)
  })
})

// ── createPreset ────────────────────────────────────────────────────────────────

describe('createPreset', () => {
  test('inserts the given preset fields', async () => {
    mocks.insertSingleMock.mockResolvedValueOnce({ data: presetRow, error: null })
    const payload = {
      name: 'Custom',
      desired_retention: 0.9,
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m']
    }
    await createPreset(payload)
    expect(mocks.insertMock).toHaveBeenCalledWith(payload)
  })

  test('returns the created row', async () => {
    mocks.insertSingleMock.mockResolvedValueOnce({ data: presetRow, error: null })
    await expect(
      createPreset({
        name: 'Custom',
        desired_retention: 0.9,
        learning_steps: ['1m'],
        relearning_steps: ['10m']
      })
    ).resolves.toEqual(presetRow)
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'insert failed' }
    mocks.insertSingleMock.mockResolvedValueOnce({ data: null, error: err })
    await expect(
      createPreset({
        name: 'Custom',
        desired_retention: 0.9,
        learning_steps: ['1m'],
        relearning_steps: ['10m']
      })
    ).rejects.toBe(err)
  })
})

// ── updatePreset ────────────────────────────────────────────────────────────────

describe('updatePreset', () => {
  test('updates with the payload (id omitted from the SET) scoped by .eq("id", id) [obligation]', async () => {
    mocks.updateSingleMock.mockResolvedValueOnce({ data: presetRow, error: null })
    await updatePreset({ id: 1, name: 'Renamed' })
    expect(mocks.updateMock).toHaveBeenCalledWith({ name: 'Renamed' })
    expect(mocks.updateMock.mock.calls[0][0]).not.toHaveProperty('id')
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', 1)
  })

  test('returns the updated row', async () => {
    mocks.updateSingleMock.mockResolvedValueOnce({ data: presetRow, error: null })
    await expect(updatePreset({ id: 1, name: 'Renamed' })).resolves.toEqual(presetRow)
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'update failed' }
    mocks.updateSingleMock.mockResolvedValueOnce({ data: null, error: err })
    await expect(updatePreset({ id: 1, name: 'Renamed' })).rejects.toBe(err)
  })
})

// ── saveDeckPacing ────────────────────────────────────────────────────────────────

describe('saveDeckPacing', () => {
  const pacing = { deck_id: 42, review_pacing_preset_id: 2, overrides: { desired_retention: 0.8 } }

  test('upserts the pacing row scoped by onConflict: "deck_id" [obligation]', async () => {
    mocks.upsertMock.mockResolvedValueOnce({ error: null })
    await saveDeckPacing(pacing)
    expect(mocks.upsertMock).toHaveBeenCalledWith(pacing, { onConflict: 'deck_id' })
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'upsert failed' }
    mocks.upsertMock.mockResolvedValueOnce({ error: err })
    await expect(saveDeckPacing(pacing)).rejects.toBe(err)
  })
})

// ── deletePreset ────────────────────────────────────────────────────────────────

describe('deletePreset', () => {
  test('deletes scoped by .eq("id", id)', async () => {
    mocks.deleteEqMock.mockResolvedValueOnce({ error: null })
    await deletePreset(1)
    expect(mocks.deleteEqMock).toHaveBeenCalledWith('id', 1)
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'delete failed' }
    mocks.deleteEqMock.mockResolvedValueOnce({ error: err })
    await expect(deletePreset(1)).rejects.toBe(err)
  })
})
