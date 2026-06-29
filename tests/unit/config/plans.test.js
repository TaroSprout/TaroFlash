import { describe, test, expect } from 'vite-plus/test'
import { PLANS } from '@/config/plans'

describe('PLANS', () => {
  // ── Entitlement limits ─────────────────────────────────────────────────────

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

  // ── Display names ──────────────────────────────────────────────────────────

  test('PLANS.free has a displayName', () => {
    expect(PLANS.free.displayName).toBeTruthy()
  })

  test('PLANS.paid has a displayName', () => {
    expect(PLANS.paid.displayName).toBeTruthy()
  })

  // ── Pricing ────────────────────────────────────────────────────────────────

  test('PLANS.free has null monthlyPriceUsd (free plan)', () => {
    expect(PLANS.free.monthlyPriceUsd).toBeNull()
  })

  test('PLANS.paid has a numeric monthlyPriceUsd', () => {
    expect(typeof PLANS.paid.monthlyPriceUsd).toBe('number')
    expect(PLANS.paid.monthlyPriceUsd).toBeGreaterThan(0)
  })

  // ── Features ───────────────────────────────────────────────────────────────

  test('PLANS.free has a non-empty features array', () => {
    expect(Array.isArray(PLANS.free.features)).toBe(true)
    expect(PLANS.free.features.length).toBeGreaterThan(0)
  })

  test('PLANS.paid has a non-empty features array', () => {
    expect(Array.isArray(PLANS.paid.features)).toBe(true)
    expect(PLANS.paid.features.length).toBeGreaterThan(0)
  })

  test('every feature has a key string', () => {
    for (const plan of Object.values(PLANS)) {
      for (const feature of plan.features) {
        expect(typeof feature.key).toBe('string')
      }
    }
  })

  // ── upgradeHighlight filter [obligation] ───────────────────────────────────

  test('PLANS.paid.features filtered by upgradeHighlight yields exactly 4 items [obligation]', () => {
    const highlighted = PLANS.paid.features.filter((f) => f.upgradeHighlight)
    expect(highlighted).toHaveLength(4)
  })

  test('upgradeHighlight features are no-deck-limit, no-card-limit, card-images, review-history [obligation]', () => {
    const highlighted = PLANS.paid.features.filter((f) => f.upgradeHighlight)
    const keys = highlighted.map((f) => f.key)
    expect(keys).toContain('no-deck-limit')
    expect(keys).toContain('no-card-limit')
    expect(keys).toContain('card-images')
    expect(keys).toContain('review-history')
  })

  test('deck-images is NOT in the upgradeHighlight set [obligation]', () => {
    const highlighted = PLANS.paid.features.filter((f) => f.upgradeHighlight)
    const keys = highlighted.map((f) => f.key)
    expect(keys).not.toContain('deck-images')
  })

  test('cancel-anytime is NOT in the upgradeHighlight set [obligation]', () => {
    const highlighted = PLANS.paid.features.filter((f) => f.upgradeHighlight)
    const keys = highlighted.map((f) => f.key)
    expect(keys).not.toContain('cancel-anytime')
  })
})
