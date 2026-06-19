import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

vi.mock('@/sfx/player', () => ({
  default: {
    play: vi.fn(() => Promise.resolve())
  },
  createAudioConfig: (cfg) => cfg
}))

vi.mock('@/utils/logger', () => ({
  default: {
    error: vi.fn()
  }
}))

const { default: player } = await import('@/sfx/player')
const { default: logger } = await import('@/utils/logger')
const { emitSfx, emitHoverSfx, setSfxPolicy } = await import('@/sfx/bus')

describe('emitSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSfxPolicy({
      enabled: true,
      categories: { ui: true, study: true },
      disable_hover_on_touch: true
    })
  })

  test('plays a single key', async () => {
    await emitSfx('ui.click_07')
    expect(player.play).toHaveBeenCalledWith('ui.click_07', {})
  })

  test('passes options when single key + opts form', async () => {
    await emitSfx('ui.click_07', { debounce: 0, volume: 0.3 })
    expect(player.play).toHaveBeenCalledWith('ui.click_07', { debounce: 0, volume: 0.3 })
  })

  test('picks a key from variadic args (random)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await emitSfx('ui.click_04', 'ui.click_07', 'ui.tap_03')
    expect(player.play).toHaveBeenCalledTimes(1)
    const [chosen] = player.play.mock.calls[0]
    expect(['ui.click_04', 'ui.click_07', 'ui.tap_03']).toContain(chosen)
    Math.random.mockRestore()
  })

  test('picks a key from array form', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitSfx(['ui.click_04', 'ui.click_07'])
    expect(player.play).toHaveBeenCalledWith('ui.click_04', {})
    Math.random.mockRestore()
  })

  test('array form passes trailing opts to player', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitSfx(['ui.click_04', 'ui.click_07'], { debounce: 0 })
    expect(player.play).toHaveBeenCalledWith('ui.click_04', { debounce: 0 })
    Math.random.mockRestore()
  })

  test('variadic form picks last index when Math.random returns ~1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    await emitSfx('ui.click_04', 'ui.click_07', 'ui.tap_03')
    expect(player.play).toHaveBeenCalledWith('ui.tap_03', {})
    Math.random.mockRestore()
  })

  test('variadic form treats trailing opts object correctly', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitSfx('ui.click_04', 'ui.click_07', { debounce: 5 })
    expect(player.play).toHaveBeenCalledWith('ui.click_04', { debounce: 5 })
    Math.random.mockRestore()
  })

  test('no-op when policy disabled', async () => {
    setSfxPolicy({ enabled: false })
    await emitSfx('ui.click_07')
    expect(player.play).not.toHaveBeenCalled()
  })

  test('no-op when category disabled', async () => {
    setSfxPolicy({ categories: { ui: false } })
    await emitSfx('ui.click_07')
    expect(player.play).not.toHaveBeenCalled()
  })

  test('study category enabled by default — study.transition_up reaches player [obligation]', async () => {
    // Regression: policy.categories only had { ui: true }, so study sounds were silently dropped.
    // Default policy must include study: true so study.* keys reach player.play.
    setSfxPolicy({
      enabled: true,
      categories: { ui: true, study: true },
      disable_hover_on_touch: true
    })
    await emitSfx('study.transition_up')
    expect(player.play).toHaveBeenCalledWith('study.transition_up', {})
  })

  test('no-op when array is empty', async () => {
    await emitSfx([])
    expect(player.play).not.toHaveBeenCalled()
  })

  test('logs error if player.play throws', async () => {
    player.play.mockRejectedValueOnce(new Error('boom'))
    await emitSfx('ui.click_07')
    expect(logger.error).toHaveBeenCalledWith('boom', expect.any(Error))
  })
})

describe('emitHoverSfx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSfxPolicy({ enabled: true, categories: { ui: true }, disable_hover_on_touch: true })
  })

  test('plays sound when ontouchstart is not present', async () => {
    const had = 'ontouchstart' in window
    if (had) delete window.ontouchstart
    await emitHoverSfx('ui.click_07')
    expect(player.play).toHaveBeenCalledWith('ui.click_07', {})
  })

  test('skips when ontouchstart is on window and policy says disable on touch', async () => {
    window.ontouchstart = null
    await emitHoverSfx('ui.click_07')
    expect(player.play).not.toHaveBeenCalled()
    delete window.ontouchstart
  })

  test('still plays when disable_hover_on_touch policy is false', async () => {
    window.ontouchstart = null
    setSfxPolicy({ disable_hover_on_touch: false })
    await emitHoverSfx('ui.click_07')
    expect(player.play).toHaveBeenCalled()
    delete window.ontouchstart
  })

  test('array path — randomly picks one key from the array and reaches player [obligation]', async () => {
    const had = 'ontouchstart' in window
    if (had) delete window.ontouchstart
    vi.spyOn(Math, 'random').mockReturnValue(0)
    await emitHoverSfx(['ui.type_01', 'ui.type_02', 'ui.type_03'])
    expect(player.play).toHaveBeenCalledTimes(1)
    expect(['ui.type_01', 'ui.type_02', 'ui.type_03']).toContain(player.play.mock.calls[0][0])
    Math.random.mockRestore()
  })
})
