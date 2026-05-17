import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => ({
  singleMock: vi.fn(),
  selectMock: vi.fn(),
  upsertMock: vi.fn(),
  rpcMock: vi.fn(),
  uploadImageMock: vi.fn(),
  insertMediaMock: vi.fn(),
  memberIdRef: { value: 'member-uuid-1' }
}))

// Minimal supabase mock:
// - `from('cards').upsert(payload, opts?)` returns a chainable object whose
//   `.select().single()` resolves via `singleMock` and whose `.select()` alone
//   resolves via `selectMock`. Bare `.upsert(...)` (no chain) resolves via
//   `upsertMock`.
// - `rpc(name, params)` resolves via `rpcMock`.
vi.mock('@/supabase-client', () => ({
  supabase: {
    from: () => ({
      upsert: (payload, opts) => {
        const chain = {
          select: () => {
            mocks.selectMock.__payload = payload
            const withSingle = {
              single: () => mocks.singleMock({ data: payload, error: null, opts })
            }
            // The upsertCards path doesn't chain .single(), so thenify the
            // select() result itself.
            return Object.assign(withSingle, {
              then: (resolve, reject) =>
                mocks.selectMock({ data: payload, error: null, opts }).then(resolve, reject)
            })
          },
          then: (resolve, reject) => mocks.upsertMock({ payload, opts }).then(resolve, reject)
        }
        return chain
      }
    }),
    rpc: (...args) => mocks.rpcMock(...args)
  }
}))

vi.mock('@/api/media/db', () => ({
  uploadImage: mocks.uploadImageMock,
  insertMedia: mocks.insertMediaMock
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ id: mocks.memberIdRef.value })
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

// Deterministic uid so path assertions are stable.
vi.mock('@/utils/uid', () => ({ default: () => 'FIXED_UID' }))

import { saveCard, upsertCard, upsertCards, setCardImage } from '@/api/cards/db/update'

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 10,
    front_text: 'Q',
    back_text: 'A',
    rank: 1,
    member_id: 'm1',
    ...overrides
  }
}

beforeEach(() => {
  mocks.singleMock.mockReset()
  mocks.singleMock.mockResolvedValue({ data: {}, error: null })
  mocks.selectMock.mockReset()
  mocks.selectMock.mockResolvedValue({ data: [], error: null })
  mocks.upsertMock.mockReset()
  mocks.upsertMock.mockResolvedValue({ error: null })
  mocks.rpcMock.mockReset()
  mocks.rpcMock.mockResolvedValue({ error: null })
  mocks.uploadImageMock.mockReset()
  mocks.uploadImageMock.mockResolvedValue('https://cdn/x')
  mocks.insertMediaMock.mockReset()
  mocks.insertMediaMock.mockResolvedValue(undefined)
  mocks.memberIdRef.value = 'member-uuid-1'
})

describe('saveCard', () => {
  test('upserts with values merged over the current card state when values change', async () => {
    const card = makeCard()
    await saveCard(card, { front_text: 'Updated' })
    expect(mocks.singleMock).toHaveBeenCalled()
    const { data } = mocks.singleMock.mock.calls[0][0]
    expect(data.front_text).toBe('Updated')
  })

  test('does not mutate the input card', async () => {
    const card = makeCard()
    const before = { ...card }
    await saveCard(card, { front_text: 'Updated' })
    expect(card).toEqual(before)
  })

  test('skips upsert when card has no id', async () => {
    const card = makeCard({ id: 0 })
    await saveCard(card, { front_text: 'New' })
    expect(mocks.singleMock).not.toHaveBeenCalled()
  })

  test('strips runtime-only fields (review, state) from the upsert payload', async () => {
    const card = { ...makeCard(), review: { due: new Date() }, state: 'unreviewed' }
    await saveCard(card, { front_text: 'X' })
    const payload = mocks.selectMock.__payload
    expect('review' in payload).toBe(false)
    expect('state' in payload).toBe(false)
  })
})

describe('upsertCard', () => {
  test('upserts a single card on the cards table with onConflict: id', async () => {
    await upsertCard(makeCard({ front_text: 'New' }))
    expect(mocks.singleMock).toHaveBeenCalled()
    const { opts } = mocks.singleMock.mock.calls[0][0]
    expect(opts).toEqual({ onConflict: 'id' })
  })

  test('stamps updated_at on the payload', async () => {
    await upsertCard(makeCard())
    const { data } = mocks.singleMock.mock.calls[0][0]
    expect(data.updated_at).toBeTruthy()
  })

  test('throws when the DB returns an error', async () => {
    mocks.singleMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(upsertCard(makeCard())).rejects.toThrow('boom')
  })
})

describe('upsertCards', () => {
  test('stamps updated_at on every card in the batch', async () => {
    await upsertCards([makeCard({ id: 1 }), makeCard({ id: 2 })])
    const payload = mocks.selectMock.__payload
    expect(payload).toHaveLength(2)
    expect(payload.every((c) => c.updated_at)).toBe(true)
  })

  test('throws when the DB returns an error', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(upsertCards([makeCard()])).rejects.toThrow('boom')
  })
})

describe('setCardImage', () => {
  test('builds the path with member_id/card_id/side/uid.ext and uploads first, then inserts media', async () => {
    const call_order = []
    mocks.uploadImageMock.mockImplementationOnce(async () => call_order.push('upload'))
    mocks.insertMediaMock.mockImplementationOnce(async () => call_order.push('insert'))

    const file = new File(['x'], 'f.png', { type: 'image/png' })
    await setCardImage(42, file, 'front')

    expect(mocks.uploadImageMock).toHaveBeenCalledWith(
      'cards',
      'member-uuid-1/42/front/FIXED_UID.png',
      file
    )
    expect(mocks.insertMediaMock).toHaveBeenCalledWith({
      bucket: 'cards',
      path: 'member-uuid-1/42/front/FIXED_UID.png',
      card_id: 42,
      slot: 'card_front'
    })
    expect(call_order).toEqual(['upload', 'insert'])
  })

  test('uses card_back slot for back images', async () => {
    const file = new File(['x'], 'f.png', { type: 'image/png' })
    await setCardImage(42, file, 'back')
    const [, path] = mocks.uploadImageMock.mock.calls[0]
    expect(path).toContain('/back/')
    const [params] = mocks.insertMediaMock.mock.calls[0]
    expect(params.slot).toBe('card_back')
  })

  test('throws before touching storage when the member is not authenticated', async () => {
    mocks.memberIdRef.value = undefined
    const file = new File(['x'], 'f.png', { type: 'image/png' })
    await expect(setCardImage(42, file, 'front')).rejects.toThrow(/Not authenticated/)
    expect(mocks.uploadImageMock).not.toHaveBeenCalled()
  })

  test('does not call insertMedia when upload fails (old image stays intact)', async () => {
    mocks.uploadImageMock.mockRejectedValueOnce(new Error('upload failed'))
    const file = new File(['x'], 'f.png', { type: 'image/png' })
    await expect(setCardImage(42, file, 'front')).rejects.toThrow('upload failed')
    expect(mocks.insertMediaMock).not.toHaveBeenCalled()
  })
})
