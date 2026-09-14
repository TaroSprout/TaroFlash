import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { createApp, h } from 'vue'
import { provideOverlayContext, useOverlayContext } from '@/composables/overlay/overlay-context'

function makeEntry(overrides = {}) {
  return { id: 'e1', markEntered: () => {}, ...overrides }
}

let app

afterEach(() => {
  app?.unmount()
  app = undefined
})

describe('provideOverlayContext', () => {
  test('close and dismiss on the context are the source functions passed in', () => {
    const close = vi.fn()
    const dismiss = vi.fn()
    let context

    app = createApp({
      setup() {
        context = provideOverlayContext({ entry: makeEntry(), close, dismiss })
        return () => null
      }
    })
    app.mount(document.createElement('div'))

    context.close('outcome')
    context.dismiss()

    expect(close).toHaveBeenCalledWith('outcome')
    expect(dismiss).toHaveBeenCalledTimes(1)
  })

  test('entered resolves once the entry markEntered is invoked by the host', async () => {
    const entry = makeEntry()
    let context

    app = createApp({
      setup() {
        context = provideOverlayContext({ entry, close: vi.fn(), dismiss: vi.fn() })
        return () => null
      }
    })
    app.mount(document.createElement('div'))

    let entered_resolved = false
    context.entered.then(() => {
      entered_resolved = true
    })
    await Promise.resolve()
    expect(entered_resolved).toBe(false)

    entry.markEntered()
    await context.entered
    expect(entered_resolved).toBe(true)
  })

  test('onCloseRequest wires the veto function into entry.interceptor', async () => {
    const entry = makeEntry()
    let context

    app = createApp({
      setup() {
        context = provideOverlayContext({ entry, close: vi.fn(), dismiss: vi.fn() })
        return () => null
      }
    })
    app.mount(document.createElement('div'))

    const veto = vi.fn().mockResolvedValue(false)
    context.onCloseRequest(veto)

    const allowed = await entry.interceptor()
    expect(veto).toHaveBeenCalledTimes(1)
    expect(allowed).toBe(false)
  })
})

describe('useOverlayContext', () => {
  test('throws when called outside any overlay-provided component', () => {
    let thrown
    app = createApp({
      setup() {
        try {
          useOverlayContext()
        } catch (error) {
          thrown = error
        }
        return () => null
      }
    })
    app.mount(document.createElement('div'))

    expect(thrown).toBeInstanceOf(Error)
    expect(thrown.message).toBe('useOverlayContext must be called inside an overlay')
  })

  test('a nested descendant reads the same context provided by an ancestor', () => {
    const entry = makeEntry()
    let provided
    let read

    const Child = {
      setup() {
        read = useOverlayContext()
        return () => null
      }
    }

    app = createApp({
      setup() {
        provided = provideOverlayContext({ entry, close: vi.fn(), dismiss: vi.fn() })
        return () => h(Child)
      }
    })
    app.mount(document.createElement('div'))

    expect(read).toBe(provided)
  })
})
