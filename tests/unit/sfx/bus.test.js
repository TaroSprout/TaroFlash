import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

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

const { default: player } = await import('@/sfx/player')
const { default: logger } = await import('@/utils/logger')
const { pointerStationaryAfterClick } = await import('@/sfx/pointer-activity')
const { emitSfx, emitHoverSfx, emitStudySfx } = await import('@/sfx/bus')

describe('emitSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('plays a single key', async () => {
    await emitSfx('click_07')
    expect(player.play).toHaveBeenCalledWith('click_07', {})
  })

  test('passes options when single key + opts', async () => {
    await emitSfx('click_07', { debounce: 0, volume: 0.3 })
    expect(player.play).toHaveBeenCalledWith('click_07', { debounce: 0, volume: 0.3 })
  })

  test('picks a key from array form', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitSfx(['click_04', 'click_07'])
    expect(player.play).toHaveBeenCalledWith('click_04', {})
    Math.random.mockRestore()
  })

  test('picks last index when Math.random returns ~1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    await emitSfx(['click_04', 'click_07', 'tap_03'])
    expect(player.play).toHaveBeenCalledWith('tap_03', {})
    Math.random.mockRestore()
  })

  test('array form passes trailing opts to player', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitSfx(['click_04', 'click_07'], { debounce: 0 })
    expect(player.play).toHaveBeenCalledWith('click_04', { debounce: 0 })
    Math.random.mockRestore()
  })

  test('no-op when array is empty', async () => {
    await emitSfx([])
    expect(player.play).not.toHaveBeenCalled()
  })

  test('logs error if player.play throws', async () => {
    player.play.mockRejectedValueOnce(new Error('boom'))
    await emitSfx('click_07')
    expect(logger.error).toHaveBeenCalledWith('boom', expect.any(Error))
  })

  test('transition_up reaches player (flat key, no namespace)', async () => {
    await emitSfx('transition_up')
    expect(player.play).toHaveBeenCalledWith('transition_up', {})
  })
})

describe('emitHoverSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: not a touch device, pointer has moved
    if ('ontouchstart' in window) delete window.ontouchstart
    pointerStationaryAfterClick.mockReturnValue(false)
  })

  test('plays sound when ontouchstart is not present', async () => {
    await emitHoverSfx('click_07')
    expect(player.play).toHaveBeenCalledWith('click_07', { bus: 'hover' })
  })

  test('forces bus:hover even for a key without defaultBus:hover (tap_05 in TYPE_SFX) [obligation]', async () => {
    // tap_05 has no defaultBus in config — its default_bus resolves to 'interface'.
    // emitHoverSfx must override and forward { bus: 'hover' } regardless.
    await emitHoverSfx('tap_05')
    expect(player.play).toHaveBeenCalledWith('tap_05', { bus: 'hover' })
  })

  test('preserves caller-supplied opts while forcing bus:hover [obligation]', async () => {
    await emitHoverSfx('click_07', { debounce: 0 })
    expect(player.play).toHaveBeenCalledWith('click_07', { debounce: 0, bus: 'hover' })
  })

  test('caller bus override is superseded by the forced hover bus [obligation]', async () => {
    // Even if the caller passes { bus: 'interface' }, emitHoverSfx wins with 'hover'.
    await emitHoverSfx('click_07', { bus: 'interface' })
    expect(player.play).toHaveBeenCalledWith('click_07', { bus: 'hover' })
  })

  test('skips when ontouchstart is on window (touch-primary) [obligation]', async () => {
    window.ontouchstart = null
    await emitHoverSfx('click_07')
    expect(player.play).not.toHaveBeenCalled()
    delete window.ontouchstart
  })

  test('skips when pointerStationaryAfterClick returns true [obligation]', async () => {
    pointerStationaryAfterClick.mockReturnValueOnce(true)
    await emitHoverSfx('click_07')
    expect(player.play).not.toHaveBeenCalled()
  })

  test('array path — picks one key and forwards bus:hover [obligation]', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitHoverSfx(['type_01', 'type_02', 'type_03'])
    expect(player.play).toHaveBeenCalledTimes(1)
    expect(player.play.mock.calls[0][0]).toBe('type_01')
    expect(player.play.mock.calls[0][1]).toMatchObject({ bus: 'hover' })
    Math.random.mockRestore()
  })
})

describe('emitStudySfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls player.play with bus:study [obligation]', async () => {
    await emitStudySfx('transition_up')
    expect(player.play).toHaveBeenCalledWith('transition_up', { bus: 'study' })
  })

  test('merges caller opts with bus:study', async () => {
    await emitStudySfx('transition_up', { blocking: true })
    expect(player.play).toHaveBeenCalledWith('transition_up', { blocking: true, bus: 'study' })
  })

  test('array form — picks one key and routes to study bus', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitStudySfx(['transition_up', 'transition_down'])
    expect(player.play).toHaveBeenCalledWith('transition_up', { bus: 'study' })
    Math.random.mockRestore()
  })
})
