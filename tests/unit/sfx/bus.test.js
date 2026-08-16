import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockRoleDef } = vi.hoisted(() => ({
  mockRoleDef: vi.fn()
}))

vi.mock('@/sfx/player', () => ({
  default: {
    play: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('@/utils/logger', () => ({
  default: {
    error: vi.fn()
  }
}))

vi.mock('@/sfx/pointer-activity', () => ({
  pointerStationaryAfterClick: vi.fn(() => false)
}))

vi.mock('@/sfx/roles', () => ({
  roleDef: mockRoleDef
}))

const { default: player } = await import('@/sfx/player')
const { default: logger } = await import('@/utils/logger')
const { pointerStationaryAfterClick } = await import('@/sfx/pointer-activity')
const { emitSfx, emitHoverSfx } = await import('@/sfx/bus')

describe('emitSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("plays the role's own sound on the role's own bus and debounce", async () => {
    mockRoleDef.mockReturnValue({ sound: 'click_07', bus: 'interface', debounce: 40 })
    await emitSfx('ui.press')
    expect(player.play).toHaveBeenCalledWith('click_07', { bus: 'interface', debounce: 40 })
  })

  test('a role with no bus/debounce set forwards them as undefined', async () => {
    mockRoleDef.mockReturnValue({ sound: 'click_07' })
    await emitSfx('ui.press')
    expect(player.play).toHaveBeenCalledWith('click_07', { bus: undefined, debounce: undefined })
  })

  // ── preview_bus [obligation] ────────────────────────────────────────────────

  test('preview_bus overrides the bus the role would otherwise resolve to [obligation]', async () => {
    mockRoleDef.mockReturnValue({ sound: 'click_07', bus: 'interface' })
    await emitSfx('gesture.tick', 'hover')
    expect(player.play).toHaveBeenCalledWith('click_07', { bus: 'hover', debounce: undefined })
  })

  test('preview_bus never changes which sound plays [obligation]', async () => {
    mockRoleDef.mockReturnValue({ sound: 'click_07', bus: 'interface' })
    await emitSfx('gesture.tick', 'hover')
    expect(player.play.mock.calls[0][0]).toBe('click_07')
  })

  // ── array sound [obligation] ────────────────────────────────────────────────

  test('an array sound picks one uniformly at random [obligation]', async () => {
    mockRoleDef.mockReturnValue({ sound: ['click_04', 'click_07', 'tap_05'], bus: 'hover' })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitSfx('ui.hover')
    expect(player.play).toHaveBeenCalledWith('click_04', { bus: 'hover', debounce: undefined })
    Math.random.mockRestore()
  })

  test('an array sound picks the last entry when Math.random returns ~1 [obligation]', async () => {
    mockRoleDef.mockReturnValue({ sound: ['click_04', 'click_07', 'tap_05'], bus: 'hover' })
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    await emitSfx('ui.hover')
    expect(player.play).toHaveBeenCalledWith('tap_05', { bus: 'hover', debounce: undefined })
    Math.random.mockRestore()
  })

  test('an empty array resolves silently without touching the player [obligation]', async () => {
    mockRoleDef.mockReturnValue({ sound: [] })
    await emitSfx('ui.hover')
    expect(player.play).not.toHaveBeenCalled()
  })

  test('logs error if player.play throws', async () => {
    mockRoleDef.mockReturnValue({ sound: 'click_07' })
    player.play.mockRejectedValueOnce(new Error('boom'))
    await emitSfx('ui.press')
    expect(logger.error).toHaveBeenCalledWith('boom', expect.any(Error))
  })
})

describe('emitHoverSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoleDef.mockReturnValue({ sound: 'click_07', bus: 'hover' })
    // Default: not a touch device, pointer has moved
    if ('ontouchstart' in window) delete window.ontouchstart
    pointerStationaryAfterClick.mockReturnValue(false)
  })

  test('delegates to emitSfx for the role when the pointer is a real hover', async () => {
    await emitHoverSfx('ui.hover')
    expect(player.play).toHaveBeenCalledWith('click_07', { bus: 'hover', debounce: undefined })
  })

  // ── touch-primary [obligation] ──────────────────────────────────────────────

  test('stays silent on a touch-primary pointer [obligation]', async () => {
    window.ontouchstart = null
    await emitHoverSfx('ui.hover')
    expect(player.play).not.toHaveBeenCalled()
    delete window.ontouchstart
  })

  // ── stationary after click [obligation] ─────────────────────────────────────

  test('stays silent when the pointer is stationary after a click [obligation]', async () => {
    pointerStationaryAfterClick.mockReturnValueOnce(true)
    await emitHoverSfx('ui.hover')
    expect(player.play).not.toHaveBeenCalled()
  })
})
