import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  selectMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    rpc: (...args) => mocks.rpcMock(...args)
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import {
  fetchFeedbackItems,
  submitFeedback,
  toggleFeedbackVote,
  updateFeedbackItem
} from '@/api/feedback/db'

beforeEach(() => {
  mocks.rpcMock.mockReset()
  mocks.selectMock.mockReset()
})

// ── fetchFeedbackItems ─────────────────────────────────────────────────────────

describe('fetchFeedbackItems', () => {
  test('calls the feedback_items_with_votes rpc and selects *', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: [{ id: 1 }], error: null })
    mocks.rpcMock.mockReturnValueOnce({ select: mocks.selectMock })
    await fetchFeedbackItems()
    expect(mocks.rpcMock).toHaveBeenCalledWith('feedback_items_with_votes')
    expect(mocks.selectMock).toHaveBeenCalledWith('*')
  })

  test('returns the rows on success', async () => {
    const rows = [{ id: 1 }, { id: 2 }]
    mocks.selectMock.mockResolvedValueOnce({ data: rows, error: null })
    mocks.rpcMock.mockReturnValueOnce({ select: mocks.selectMock })
    await expect(fetchFeedbackItems()).resolves.toEqual(rows)
  })

  test('returns an empty array when data is null', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: null, error: null })
    mocks.rpcMock.mockReturnValueOnce({ select: mocks.selectMock })
    await expect(fetchFeedbackItems()).resolves.toEqual([])
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'boom' }
    mocks.selectMock.mockResolvedValueOnce({ data: null, error: err })
    mocks.rpcMock.mockReturnValueOnce({ select: mocks.selectMock })
    await expect(fetchFeedbackItems()).rejects.toBe(err)
  })
})

// ── submitFeedback ─────────────────────────────────────────────────────────────

describe('submitFeedback', () => {
  test('calls submit_feedback with p_title/p_body/p_type mapped from params', async () => {
    mocks.rpcMock.mockReturnValueOnce({ data: { id: 1 }, error: null })
    await submitFeedback({ title: 'Title', body: 'Body', type: 'idea' })
    expect(mocks.rpcMock).toHaveBeenCalledWith('submit_feedback', {
      p_title: 'Title',
      p_body: 'Body',
      p_type: 'idea'
    })
  })

  test('returns the created item on success', async () => {
    const item = { id: 1, title: 'Title' }
    mocks.rpcMock.mockReturnValueOnce({ data: item, error: null })
    await expect(submitFeedback({ title: 'Title', type: 'idea' })).resolves.toEqual(item)
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'Title is required' }
    mocks.rpcMock.mockReturnValueOnce({ data: null, error: err })
    await expect(submitFeedback({ title: '', type: 'idea' })).rejects.toBe(err)
  })
})

// ── toggleFeedbackVote ─────────────────────────────────────────────────────────

describe('toggleFeedbackVote', () => {
  test('calls toggle_feedback_vote with p_feedback_id', async () => {
    mocks.rpcMock.mockReturnValueOnce({ data: true, error: null })
    await toggleFeedbackVote(5)
    expect(mocks.rpcMock).toHaveBeenCalledWith('toggle_feedback_vote', { p_feedback_id: 5 })
  })

  test('returns the new voted state', async () => {
    mocks.rpcMock.mockReturnValueOnce({ data: false, error: null })
    await expect(toggleFeedbackVote(5)).resolves.toBe(false)
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'Not authenticated' }
    mocks.rpcMock.mockReturnValueOnce({ data: null, error: err })
    await expect(toggleFeedbackVote(5)).rejects.toBe(err)
  })
})

// ── updateFeedbackItem ─────────────────────────────────────────────────────────

describe('updateFeedbackItem', () => {
  test('calls update_feedback_item with p_feedback_id/p_status/p_visibility mapped from params', async () => {
    mocks.rpcMock.mockReturnValueOnce({ data: { id: 5 }, error: null })
    await updateFeedbackItem({ feedback_id: 5, status: 'accepted', visibility: 'public' })
    expect(mocks.rpcMock).toHaveBeenCalledWith('update_feedback_item', {
      p_feedback_id: 5,
      p_status: 'accepted',
      p_visibility: 'public'
    })
  })

  test('returns the updated item on success', async () => {
    const item = { id: 5, status: 'accepted' }
    mocks.rpcMock.mockReturnValueOnce({ data: item, error: null })
    await expect(
      updateFeedbackItem({ feedback_id: 5, status: 'accepted', visibility: 'public' })
    ).resolves.toEqual(item)
  })

  test('rethrows the supabase error', async () => {
    const err = { message: 'Not permitted' }
    mocks.rpcMock.mockReturnValueOnce({ data: null, error: err })
    await expect(
      updateFeedbackItem({ feedback_id: 5, status: 'accepted', visibility: 'public' })
    ).rejects.toBe(err)
  })
})
