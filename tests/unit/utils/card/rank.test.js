import { describe, test, expect } from 'vite-plus/test'
import { rankBetween, ranksBetween, resolveRankNeighbours } from '@/utils/card/rank'

describe('rankBetween', () => {
  test('mints the first key of an empty deck when both neighbours are null', () => {
    const key = rankBetween({ prev: null, next: null })
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(0)
  })

  test('mints a key strictly between prev and next', () => {
    const key = rankBetween({ prev: 'a0', next: 'a2' })
    expect(key > 'a0').toBe(true)
    expect(key < 'a2').toBe(true)
  })

  test('mints a key after prev when next is null (append)', () => {
    const key = rankBetween({ prev: 'a0', next: null })
    expect(key > 'a0').toBe(true)
  })

  test('mints a key before next when prev is null (prepend)', () => {
    const key = rankBetween({ prev: null, next: 'a5' })
    expect(key < 'a5').toBe(true)
  })

  test('throws when prev >= next — stale-neighbour guard', () => {
    expect(() => rankBetween({ prev: 'b0', next: 'a0' })).toThrow()
  })
})

describe('ranksBetween', () => {
  test('mints `count` keys, strictly ascending', () => {
    const keys = ranksBetween({ prev: null, next: null }, 3)
    expect(keys).toHaveLength(3)
    expect(keys[0] < keys[1]).toBe(true)
    expect(keys[1] < keys[2]).toBe(true)
  })

  test('all keys sit strictly between prev and next', () => {
    const keys = ranksBetween({ prev: 'a0', next: 'a9' }, 4)
    keys.forEach((key) => {
      expect(key > 'a0').toBe(true)
      expect(key < 'a9').toBe(true)
    })
  })
})

describe('resolveRankNeighbours', () => {
  function ranked(rank) {
    return { rank }
  }

  const unranked = { rank: undefined }

  test('prev is the ranked entry immediately before slot', () => {
    const cards = [ranked('a0'), ranked('a1'), ranked('a2')]
    const { prev } = resolveRankNeighbours(cards, 2)
    expect(prev).toBe('a1')
  })

  test('next is the ranked entry at-or-after slot', () => {
    const cards = [ranked('a0'), ranked('a1'), ranked('a2')]
    const { next } = resolveRankNeighbours(cards, 1)
    expect(next).toBe('a1')
  })

  test('skips unranked (staged) entries walking left for prev', () => {
    const cards = [ranked('a0'), unranked, unranked]
    const { prev } = resolveRankNeighbours(cards, 3)
    expect(prev).toBe('a0')
  })

  test('skips unranked (staged) entries walking right for next', () => {
    const cards = [ranked('a0'), unranked, unranked, ranked('a3')]
    const { next } = resolveRankNeighbours(cards, 1)
    expect(next).toBe('a3')
  })

  test('prev is null at the head of the list (nothing before slot 0)', () => {
    const cards = [ranked('a0'), ranked('a1')]
    const { prev } = resolveRankNeighbours(cards, 0)
    expect(prev).toBeNull()
  })

  test('next falls back to tail_rank when nothing ranked lies to the right — page-boundary case', () => {
    const cards = [ranked('a0'), ranked('a1')]
    const { next } = resolveRankNeighbours(cards, 2, 'z9')
    expect(next).toBe('z9')
  })

  test('next is null (not the whole-deck end) when no tail_rank is given and nothing lies to the right', () => {
    const cards = [ranked('a0'), ranked('a1')]
    const { next } = resolveRankNeighbours(cards, 2)
    expect(next).toBeNull()
  })

  test('both prev and next null for an empty card list', () => {
    const { prev, next } = resolveRankNeighbours([], 0)
    expect(prev).toBeNull()
    expect(next).toBeNull()
  })
})
