import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import {
  randomCoverConfig,
  SUPPORTED_PALETTES,
  SUPPORTED_PATTERNS,
  SUPPORTED_ICONS
} from '@/utils/cover'

describe('randomCoverConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('returns a config whose fields are drawn from SUPPORTED_* lists', () => {
    const config = randomCoverConfig()

    expect(SUPPORTED_PALETTES).toContain(config.palette)
    expect(SUPPORTED_PATTERNS).toContain(config.pattern)
    expect(SUPPORTED_ICONS).toContain(config.icon)
  })

  test('picks the first element when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const config = randomCoverConfig()

    expect(config.palette).toBe(SUPPORTED_PALETTES[0])
    expect(config.pattern).toBe(SUPPORTED_PATTERNS[0])
    expect(config.icon).toBe(SUPPORTED_ICONS[0])
  })

  test('picks the last element when Math.random returns just under 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    const config = randomCoverConfig()

    expect(config.palette).toBe(SUPPORTED_PALETTES[SUPPORTED_PALETTES.length - 1])
    expect(config.pattern).toBe(SUPPORTED_PATTERNS[SUPPORTED_PATTERNS.length - 1])
    expect(config.icon).toBe(SUPPORTED_ICONS[SUPPORTED_ICONS.length - 1])
  })
})
