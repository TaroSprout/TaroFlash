import { describe, test, expect } from 'vite-plus/test'
import { hashFile } from '@/utils/hash'

describe('hashFile', () => {
  test('returns the SHA-256 hex digest of the file bytes', async () => {
    const hash = await hashFile(new File(['abc'], 'a.txt', { type: 'text/plain' }))
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  test('identical bytes hash identically regardless of filename or type', async () => {
    const a = await hashFile(new File(['same'], 'one.png', { type: 'image/png' }))
    const b = await hashFile(new File(['same'], 'two.webp', { type: 'image/webp' }))
    expect(a).toBe(b)
  })

  test('different bytes produce different hashes', async () => {
    const a = await hashFile(new File(['x'], 'a.png', { type: 'image/png' }))
    const b = await hashFile(new File(['y'], 'b.png', { type: 'image/png' }))
    expect(a).not.toBe(b)
  })
})
