import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockResolveModalAfterEnter } = vi.hoisted(() => ({
  mockResolveModalAfterEnter: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  resolveModalAfterEnter: mockResolveModalAfterEnter
}))

const { mockDialogEnter, mockDialogLeave } = vi.hoisted(() => ({
  mockDialogEnter: vi.fn((_el, _is_mobile, done) => done()),
  mockDialogLeave: vi.fn((_el, _is_mobile, done) => done())
}))

vi.mock('@/components/ui-kit/modal/mode-config', () => ({
  MODAL_MODE_CONFIG: {
    dialog: { enter: mockDialogEnter, leave: mockDialogLeave }
  }
}))

vi.mock('@/components/ui-kit/modal/mobile-below', () => ({
  DEFAULT_MODE: 'dialog',
  isMobileFor: vi.fn(() => false)
}))

import { useModalTransitions } from '@/components/ui-kit/modal/use-modal-transitions'

beforeEach(() => {
  mockResolveModalAfterEnter.mockClear()
  mockDialogEnter.mockClear()
  mockDialogLeave.mockClear()
})

describe('useModalTransitions', () => {
  test('onBeforeEnter sets the will-change hint for transform + opacity', () => {
    const { onBeforeEnter } = useModalTransitions()
    const el = document.createElement('div')

    onBeforeEnter(el)

    expect(el.style.willChange).toBe('transform, opacity')
  })

  test('onEnter dispatches to the mode config resolved from data-modal-mode', () => {
    const { onEnter } = useModalTransitions()
    const el = document.createElement('div')
    el.dataset.modalMode = 'dialog'
    const done = vi.fn()

    onEnter(el, done)

    expect(mockDialogEnter).toHaveBeenCalledWith(el, false, expect.any(Function))
  })

  test('onEnter clears the will-change hint and calls done once the mode config settles', () => {
    const { onEnter } = useModalTransitions()
    const el = document.createElement('div')
    el.style.willChange = 'transform, opacity'
    const done = vi.fn()

    onEnter(el, done)

    expect(el.style.willChange).toBe('')
    expect(done).toHaveBeenCalledOnce()
  })

  test('onAfterEnter resolves the after-enter promise for the element data-modal-id', () => {
    const { onAfterEnter } = useModalTransitions()
    const el = document.createElement('div')
    el.dataset.modalId = 'modal-123'

    onAfterEnter(el)

    expect(mockResolveModalAfterEnter).toHaveBeenCalledWith('modal-123')
  })

  test('onAfterEnter is a no-op when the element has no data-modal-id', () => {
    const { onAfterEnter } = useModalTransitions()
    const el = document.createElement('div')

    onAfterEnter(el)

    expect(mockResolveModalAfterEnter).not.toHaveBeenCalled()
  })

  test('onLeave sets the will-change hint before dispatching to the mode config', () => {
    const { onLeave } = useModalTransitions()
    const el = document.createElement('div')
    el.dataset.modalMode = 'dialog'
    const done = vi.fn()

    mockDialogLeave.mockImplementationOnce((leave_el) => {
      expect(leave_el.style.willChange).toBe('transform, opacity')
    })

    onLeave(el, done)

    expect(mockDialogLeave).toHaveBeenCalledWith(el, false, expect.any(Function))
  })

  test('onLeave clears the will-change hint and calls done once the mode config settles', () => {
    const { onLeave } = useModalTransitions()
    const el = document.createElement('div')
    const done = vi.fn()

    onLeave(el, done)

    expect(el.style.willChange).toBe('')
    expect(done).toHaveBeenCalledOnce()
  })
})
