import { describe, test, expect } from 'vite-plus/test'
import { PLANS } from '@/config/plans'

describe('PLANS', () => {
  test('PLANS.free has a deckLimit', () => {
    expect(PLANS.free.deckLimit).not.toBeNull()
  })

  test('PLANS.paid has null deckLimit (unlimited)', () => {
    expect(PLANS.paid.deckLimit).toBeNull()
  })

  test('PLANS.free has a cardsPerDeckLimit', () => {
    expect(PLANS.free.cardsPerDeckLimit).not.toBeNull()
  })

  test('PLANS.paid has null cardsPerDeckLimit (unlimited)', () => {
    expect(PLANS.paid.cardsPerDeckLimit).toBeNull()
  })
})
