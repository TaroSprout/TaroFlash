import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const mocks = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  removeMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn()
}))

vi.mock('@/supabase-client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mocks.uploadMock,
        remove: mocks.removeMock,
        getPublicUrl: mocks.getPublicUrlMock
      }))
    },
    from: vi.fn(() => ({
      insert: mocks.insertMock,
      update: mocks.updateMock
    }))
  }
}))

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }))

import { supabase } from '@/supabase-client'
import {
  uploadImage,
  deleteImage,
  getImageUrl,
  cardImageUrl,
  insertMedia,
  deleteMedia
} from '@/api/media/db'

describe('uploadImage', () => {
  beforeEach(() => {
    mocks.uploadMock.mockReset()
    mocks.getPublicUrlMock.mockReset()
    mocks.getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn/p' } })
    supabase.storage.from.mockClear()
  })

  test('uploads the file at the given path with upsert=true and returns the public URL', async () => {
    mocks.uploadMock.mockResolvedValueOnce({ error: null })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const url = await uploadImage('cards', 'member/card/front/abc.png', file)
    expect(supabase.storage.from).toHaveBeenCalledWith('cards')
    expect(mocks.uploadMock).toHaveBeenCalledWith('member/card/front/abc.png', file, {
      upsert: true
    })
    expect(url).toBe('https://cdn/p')
  })

  test('does not prepend anything to the caller-provided path', async () => {
    mocks.uploadMock.mockResolvedValueOnce({ error: null })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await uploadImage('cards', 'already/fully/qualified.png', file)
    const [path] = mocks.uploadMock.mock.calls[0]
    expect(path).toBe('already/fully/qualified.png')
  })

  test('throws when the upload fails', async () => {
    mocks.uploadMock.mockResolvedValueOnce({ error: { message: 'bucket not found' } })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await expect(uploadImage('cards', 'p', file)).rejects.toThrow('bucket not found')
  })
})

describe('deleteImage', () => {
  beforeEach(() => {
    mocks.removeMock.mockReset()
  })

  test('removes the given path from the bucket', async () => {
    mocks.removeMock.mockResolvedValueOnce({ error: null })
    await deleteImage('cards', 'member/file.png')
    expect(mocks.removeMock).toHaveBeenCalledWith(['member/file.png'])
  })

  test('throws when the remove fails', async () => {
    mocks.removeMock.mockResolvedValueOnce({ error: { message: 'denied' } })
    await expect(deleteImage('cards', 'p')).rejects.toThrow('denied')
  })
})

describe('getImageUrl', () => {
  beforeEach(() => {
    mocks.getPublicUrlMock.mockReset()
  })

  test('returns the public URL for the given path with no prepending', () => {
    mocks.getPublicUrlMock.mockReturnValueOnce({ data: { publicUrl: 'https://cdn/x' } })
    const url = getImageUrl('cards', 'member/card/front/abc.png')
    expect(mocks.getPublicUrlMock).toHaveBeenCalledWith('member/card/front/abc.png')
    expect(url).toBe('https://cdn/x')
  })
})

describe('cardImageUrl', () => {
  beforeEach(() => {
    mocks.getPublicUrlMock.mockReset()
  })

  test('resolves the path against the member-images bucket', () => {
    mocks.getPublicUrlMock.mockReturnValueOnce({ data: { publicUrl: 'https://cdn/card' } })
    const url = cardImageUrl('member-uuid/abc123.png')
    expect(supabase.storage.from).toHaveBeenCalledWith('member-images')
    expect(mocks.getPublicUrlMock).toHaveBeenCalledWith('member-uuid/abc123.png')
    expect(url).toBe('https://cdn/card')
  })
})

describe('insertMedia', () => {
  beforeEach(() => {
    mocks.insertMock.mockReset()
    supabase.from.mockClear()
  })

  test('inserts into the media table with the full payload', async () => {
    mocks.insertMock.mockResolvedValueOnce({ error: null })
    const params = { bucket: 'cards', path: 'p', card_id: 1, slot: 'card_front' }
    await insertMedia(params)
    expect(supabase.from).toHaveBeenCalledWith('media')
    expect(mocks.insertMock).toHaveBeenCalledWith(params)
  })

  test('throws synchronously when neither card_id nor deck_id is provided', async () => {
    await expect(insertMedia({ bucket: 'cards', path: 'p' })).rejects.toThrow(
      /requires either card_id or deck_id/
    )
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })

  test('accepts deck_id alone (deck covers, no card)', async () => {
    mocks.insertMock.mockResolvedValueOnce({ error: null })
    await insertMedia({ bucket: 'decks', path: 'p', deck_id: 7 })
    expect(mocks.insertMock).toHaveBeenCalled()
  })

  test('throws when the insert fails', async () => {
    const err = { message: 'rls' }
    mocks.insertMock.mockResolvedValueOnce({ error: err })
    await expect(insertMedia({ bucket: 'cards', path: 'p', card_id: 1 })).rejects.toBe(err)
  })
})

describe('deleteMedia', () => {
  beforeEach(() => {
    mocks.updateMock.mockReset()
    mocks.eqMock.mockReset()
    mocks.updateMock.mockReturnValue({ eq: mocks.eqMock })
    supabase.from.mockClear()
  })

  test('soft-deletes by setting deleted_at and filtering by id', async () => {
    mocks.eqMock.mockResolvedValueOnce({ error: null })
    await deleteMedia('abc')
    expect(supabase.from).toHaveBeenCalledWith('media')
    const [patch] = mocks.updateMock.mock.calls[0]
    expect(patch.deleted_at).toBeInstanceOf(Date)
    expect(mocks.eqMock).toHaveBeenCalledWith('id', 'abc')
  })

  test('throws when the update fails', async () => {
    const err = { message: 'denied' }
    mocks.eqMock.mockResolvedValueOnce({ error: err })
    await expect(deleteMedia('abc')).rejects.toBe(err)
  })
})
