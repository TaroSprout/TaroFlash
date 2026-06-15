import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

let stateChangeCb
const offStateChange = vi.fn()

const engineMock = {
  resume: vi.fn().mockResolvedValue(true),
  unlock: vi.fn(),
  state: vi.fn(() => 'suspended'),
  onStateChange: vi.fn((cb) => {
    stateChangeCb = cb
    return offStateChange
  }),
  play: vi.fn(),
  decode: vi.fn(),
  onUnlock: vi.fn()
}

vi.mock('@/sfx/engine', () => ({ default: engineMock }))

async function loadLifecycle() {
  const mod = await import('@/sfx/lifecycle')
  return mod.installAudioLifecycle
}

function fireVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('installAudioLifecycle', () => {
  let teardown

  beforeEach(() => {
    vi.resetModules()
    stateChangeCb = undefined
    offStateChange.mockClear()
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.unlock.mockClear()
    engineMock.state.mockReset().mockReturnValue('suspended')
    engineMock.onStateChange.mockClear()
  })

  afterEach(() => {
    teardown?.()
    teardown = undefined
  })

  test('resumes opportunistically at install when the context is suspended', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('does nothing at install when the context is already running', async () => {
    engineMock.state.mockReturnValue('running')
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('resumes when the tab becomes visible', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('ignores the visibility change when the tab hides', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    fireVisibility('hidden')
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('resumes on pageshow', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    window.dispatchEvent(new Event('pageshow'))
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes on window focus', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    window.dispatchEvent(new Event('focus'))
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes when the engine reports a non-running statechange', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    stateChangeCb()
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('ignores statechange while the engine is running', async () => {
    engineMock.state.mockReturnValue('running')
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    stateChangeCb()
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('unlocks the engine on the next gesture', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    window.dispatchEvent(new Event('click'))
    await flushMicrotasks()

    expect(engineMock.unlock).toHaveBeenCalledTimes(1)
  })

  test('the gesture unlock fires only once across event types', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    window.dispatchEvent(new Event('touchend'))
    window.dispatchEvent(new KeyboardEvent('keydown'))
    window.dispatchEvent(new Event('click'))
    await flushMicrotasks()

    expect(engineMock.unlock).toHaveBeenCalledTimes(1)
  })

  test('teardown removes every listener', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    teardown()
    teardown = undefined
    expect(offStateChange).toHaveBeenCalledTimes(1)

    engineMock.resume.mockClear()
    fireVisibility('visible')
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('focus'))
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('a second install without teardown is a noop', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    const noopTeardown = install()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
    expect(typeof noopTeardown).toBe('function')
    noopTeardown()
  })
})
