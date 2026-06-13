import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

const stateListeners = new Set()

const mockCtx = {
  state: 'running',
  resume: vi.fn(),
  addEventListener: vi.fn((type, handler) => {
    if (type === 'statechange') stateListeners.add(handler)
  }),
  removeEventListener: vi.fn((type, handler) => {
    if (type === 'statechange') stateListeners.delete(handler)
  })
}

function fireStateChange() {
  for (const handler of stateListeners) handler()
}

let currentCtx = mockCtx

vi.mock('howler', () => ({
  Howler: {
    get ctx() {
      return currentCtx
    }
  }
}))

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

  beforeEach(async () => {
    vi.resetModules()
    stateListeners.clear()
    currentCtx = mockCtx
    mockCtx.state = 'running'
    mockCtx.resume = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    teardown?.()
    teardown = undefined
  })

  test('resumes suspended context when tab becomes visible', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockImplementation(async () => {
      mockCtx.state = 'running'
    })

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
  })

  test('ignores visibility change when tab hides', async () => {
    mockCtx.state = 'suspended'
    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('hidden')
    await flushMicrotasks()

    expect(mockCtx.resume).not.toHaveBeenCalled()
  })

  test('resumes context on pageshow', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockImplementation(async () => {
      mockCtx.state = 'running'
    })

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    window.dispatchEvent(new Event('pageshow'))
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes context on window focus', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockImplementation(async () => {
      mockCtx.state = 'running'
    })

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    window.dispatchEvent(new Event('focus'))
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes interrupted context when tab becomes visible', async () => {
    mockCtx.state = 'interrupted'
    mockCtx.resume.mockImplementation(async () => {
      mockCtx.state = 'running'
    })

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes context when it fires statechange away from running', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockImplementation(async () => {
      mockCtx.state = 'running'
    })

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireStateChange()
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
  })

  test('ignores statechange when context is already running', async () => {
    mockCtx.state = 'running'
    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireStateChange()
    await flushMicrotasks()

    expect(mockCtx.resume).not.toHaveBeenCalled()
  })

  test('skips resume when context already running', async () => {
    mockCtx.state = 'running'
    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).not.toHaveBeenCalled()
  })

  test('arms gesture retry when resume rejects', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockRejectedValueOnce(new Error('needs gesture'))

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)

    mockCtx.resume.mockResolvedValueOnce(undefined)
    window.dispatchEvent(new Event('pointerdown'))
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(2)
  })

  test('arms gesture retry when context stays suspended after resume', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockResolvedValue(undefined)

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)

    mockCtx.resume.mockImplementationOnce(async () => {
      mockCtx.state = 'running'
    })
    window.dispatchEvent(new KeyboardEvent('keydown'))
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(2)
  })

  test('gesture retry listener fires only once across event types', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockResolvedValue(undefined)

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    mockCtx.resume.mockClear()
    mockCtx.resume.mockResolvedValue(undefined)

    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new KeyboardEvent('keydown'))
    window.dispatchEvent(new Event('touchend'))
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
  })

  test('teardown removes listeners', async () => {
    mockCtx.state = 'suspended'
    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    teardown()
    teardown = undefined

    fireVisibility('visible')
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('focus'))
    fireStateChange()
    await flushMicrotasks()

    expect(mockCtx.resume).not.toHaveBeenCalled()
  })

  test('second install without teardown is a noop', async () => {
    mockCtx.state = 'suspended'
    mockCtx.resume.mockResolvedValue(undefined)

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()
    const noopTeardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).toHaveBeenCalledTimes(1)
    expect(typeof noopTeardown).toBe('function')
    noopTeardown()
  })

  test('handles missing AudioContext gracefully', async () => {
    currentCtx = null

    const installAudioLifecycle = await loadLifecycle()
    teardown = installAudioLifecycle()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(mockCtx.resume).not.toHaveBeenCalled()
  })
})
