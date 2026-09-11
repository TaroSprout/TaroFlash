import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockResolveModalAfterEnter } = vi.hoisted(() => ({
  mockResolveModalAfterEnter: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  resolveModalAfterEnter: mockResolveModalAfterEnter
}))

const { mockIsMobileFor } = vi.hoisted(() => ({
  mockIsMobileFor: vi.fn(() => false)
}))

vi.mock('@/components/ui-kit/modal/mobile-below', () => ({
  DEFAULT_MODE: 'dialog',
  isMobileFor: mockIsMobileFor
}))

const { registry, makeConfig } = vi.hoisted(() => {
  const registry = { handles: [] }
  function motionFor() {
    return vi.fn(() =>
      vi.fn((el) => {
        let resolve
        const done = new Promise((r) => {
          resolve = r
        })
        const handle = { done, resolve, el }
        registry.handles.push(handle)
        return handle
      })
    )
  }
  function makeConfig() {
    return {
      dialog: { enter: motionFor(), leave: motionFor() },
      'mobile-sheet': { enter: motionFor(), leave: motionFor() },
      popup: { enter: motionFor(), leave: motionFor() }
    }
  }
  return { registry, makeConfig }
})

vi.mock('@/components/ui-kit/modal/mode-config', () => ({ MODAL_MODE_CONFIG: makeConfig() }))

import { useModalTransitions } from '@/components/ui-kit/modal/use-modal-transitions'
import { MODAL_MODE_CONFIG } from '@/components/ui-kit/modal/mode-config'

function elWithMode(mode) {
  const el = document.createElement('div')
  if (mode) el.dataset.modalMode = mode
  return el
}

beforeEach(() => {
  mockResolveModalAfterEnter.mockClear()
  mockIsMobileFor.mockClear()
  mockIsMobileFor.mockReturnValue(false)
  registry.handles.length = 0
  for (const config of Object.values(MODAL_MODE_CONFIG)) {
    config.enter.mockClear()
    config.leave.mockClear()
  }
})

describe.each([
  ['dialog', false],
  ['mobile-sheet', false],
  ['mobile-sheet', true],
  ['popup', false]
])('mode "%s", is_mobile %s', (mode, is_mobile) => {
  test('onEnter dispatches to the resolved mode config with the current is_mobile flag and resolves done on settle', async () => {
    mockIsMobileFor.mockReturnValue(is_mobile)
    const { onEnter } = useModalTransitions()
    const el = elWithMode(mode)
    const done = vi.fn()

    onEnter(el, done)

    expect(MODAL_MODE_CONFIG[mode].enter).toHaveBeenCalledWith(is_mobile)
    const handle = registry.handles.at(-1)
    expect(handle.el).toBe(el)
    expect(done).not.toHaveBeenCalled()

    handle.resolve()
    await handle.done

    expect(done).toHaveBeenCalledOnce()
  })

  test('onLeave dispatches to the resolved mode config with the current is_mobile flag and resolves done on settle', async () => {
    mockIsMobileFor.mockReturnValue(is_mobile)
    const { onLeave } = useModalTransitions()
    const el = elWithMode(mode)
    const done = vi.fn()

    onLeave(el, done)

    expect(MODAL_MODE_CONFIG[mode].leave).toHaveBeenCalledWith(is_mobile)
    const handle = registry.handles.at(-1)
    expect(handle.el).toBe(el)
    expect(done).not.toHaveBeenCalled()

    handle.resolve()
    await handle.done

    expect(done).toHaveBeenCalledOnce()
  })
})

describe('onEnter falling back to the default mode', () => {
  test('uses the dialog config when data-modal-mode is absent', () => {
    const { onEnter } = useModalTransitions()
    const el = elWithMode(undefined)

    onEnter(el, vi.fn())

    expect(MODAL_MODE_CONFIG.dialog.enter).toHaveBeenCalled()
  })
})

describe('onAfterEnter', () => {
  test('resolves the after-enter promise for the element data-modal-id', () => {
    const { onAfterEnter } = useModalTransitions()
    const el = document.createElement('div')
    el.dataset.modalId = 'modal-123'

    onAfterEnter(el)

    expect(mockResolveModalAfterEnter).toHaveBeenCalledWith('modal-123')
  })

  test('is a no-op when the element has no data-modal-id', () => {
    const { onAfterEnter } = useModalTransitions()
    const el = document.createElement('div')

    onAfterEnter(el)

    expect(mockResolveModalAfterEnter).not.toHaveBeenCalled()
  })
})
