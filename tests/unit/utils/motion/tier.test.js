import { describe, test, expect } from 'vite-plus/test'
import { MOTION_TIER_FACTORS, tierFromSignals } from '@/utils/motion/tier'

describe('MOTION_TIER_FACTORS', () => {
  test('height_tween_budget scales down per tier, zero on minimal', () => {
    expect(MOTION_TIER_FACTORS.full.height_tween_budget).toBe(4)
    expect(MOTION_TIER_FACTORS.lean.height_tween_budget).toBe(2)
    expect(MOTION_TIER_FACTORS.minimal.height_tween_budget).toBe(0)
  })
})

describe('tierFromSignals', () => {
  test('device_memory absent returns full regardless of core count', () => {
    expect(tierFromSignals({ cores: 1 })).toBe('full')
    expect(tierFromSignals({})).toBe('full')
  })

  test('device_memory at or below 2GB returns minimal', () => {
    expect(tierFromSignals({ device_memory: 2, cores: 8 })).toBe('minimal')
    expect(tierFromSignals({ device_memory: 1, cores: 8 })).toBe('minimal')
  })

  test('cores at or below 2 returns minimal', () => {
    expect(tierFromSignals({ device_memory: 8, cores: 2 })).toBe('minimal')
    expect(tierFromSignals({ device_memory: 8, cores: 1 })).toBe('minimal')
  })

  test('device_memory at or below 4GB returns lean', () => {
    expect(tierFromSignals({ device_memory: 4, cores: 8 })).toBe('lean')
    expect(tierFromSignals({ device_memory: 3, cores: 8 })).toBe('lean')
  })

  test('cores at or below 4 returns lean', () => {
    expect(tierFromSignals({ device_memory: 8, cores: 4 })).toBe('lean')
    expect(tierFromSignals({ device_memory: 8, cores: 3 })).toBe('lean')
  })

  test('device_memory above 4GB and cores above 4 returns full', () => {
    expect(tierFromSignals({ device_memory: 8, cores: 8 })).toBe('full')
  })

  test('device_memory present but cores absent still tiers off memory alone', () => {
    expect(tierFromSignals({ device_memory: 2 })).toBe('minimal')
    expect(tierFromSignals({ device_memory: 4 })).toBe('lean')
    expect(tierFromSignals({ device_memory: 8 })).toBe('full')
  })
})
