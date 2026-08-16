import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

const { emitSfx, emitHoverSfx } = await import('@/sfx/bus')
const { vSfx } = await import('@/sfx/directive')

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type, params = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 1
      this.pointerType = params.pointerType ?? 'mouse'
    }
  }
  globalThis.PointerEvent = PointerEvent
}

function mountDirective(value, modifiers = {}) {
  const el = document.createElement('button')
  document.body.appendChild(el)
  vSfx.mounted(el, { value, modifiers })
  return el
}

function unmount(el) {
  vSfx.beforeUnmount(el)
  el.remove()
}

describe('vSfx directive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hover', () => {
    test('plays hover sfx when pointerenter pointerType is mouse', () => {
      const el = mountDirective({ hover: 'ui.hover' })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).toHaveBeenCalledWith('ui.hover')
      unmount(el)
    })

    test('does NOT play hover sfx when pointerenter pointerType is touch', () => {
      const el = mountDirective({ hover: 'ui.hover' })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      unmount(el)
    })

    test('does NOT play hover sfx when pointerenter pointerType is pen', () => {
      const el = mountDirective({ hover: 'ui.hover' })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'pen' }))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      unmount(el)
    })

    test('does NOT play hover sfx when no hover key is configured', () => {
      const el = mountDirective({ focus: 'ui.focus' })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      unmount(el)
    })

    test('beforeUnmount removes the listener', () => {
      const el = mountDirective({ hover: 'ui.hover' })

      vSfx.beforeUnmount(el)
      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      el.remove()
    })
  })

  // ── the directive no longer accepts a per-call debounce [obligation] ───────

  describe('no per-call debounce', () => {
    test('hover fires emitHoverSfx with just the role — no debounce/options argument [obligation]', () => {
      const el = mountDirective({ hover: 'ui.hover', debounce: 250 })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      // A `debounce` key on the binding value is inert — the directive only
      // ever reads cfg.hover / cfg.focus, so it's forwarded to neither call.
      expect(emitHoverSfx).toHaveBeenCalledWith('ui.hover')
      expect(emitHoverSfx).not.toHaveBeenCalledWith('ui.hover', expect.anything())
      unmount(el)
    })

    test('focus fires emitSfx with just the role — no debounce/options argument [obligation]', () => {
      const el = mountDirective({ focus: 'ui.focus', debounce: 250 })

      el.dispatchEvent(new Event('focus'))

      expect(emitSfx).toHaveBeenCalledWith('ui.focus')
      expect(emitSfx).not.toHaveBeenCalledWith('ui.focus', expect.anything())
      unmount(el)
    })
  })

  describe('click', () => {
    test('clicking an element with a press key does NOT call emitSfx — press routes through staged-tap, not the directive', () => {
      const el = mountDirective({ press: 'ui.press' })

      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(emitSfx).not.toHaveBeenCalled()
      unmount(el)
    })
  })

  describe('updated hook (binding value changes)', () => {
    test('picks up the new role on the next event without unbinding', () => {
      const el = mountDirective({ hover: 'ui.hover' })
      const oldValue = { hover: 'ui.hover' }
      const newValue = { hover: 'ui.select' }

      vSfx.updated(el, { value: newValue, oldValue, modifiers: {} })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).toHaveBeenCalledWith('ui.select')
      unmount(el)
    })

    test('skips work when value reference is unchanged', () => {
      const el = mountDirective({ hover: 'ui.hover' })
      const value = { hover: 'ui.hover' }

      vSfx.updated(el, { value, oldValue: value, modifiers: {} })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).toHaveBeenCalledTimes(1)
      unmount(el)
    })

    test('attaches listeners on update if mounted with no binding value', () => {
      const el = document.createElement('button')
      document.body.appendChild(el)
      vSfx.mounted(el, { value: undefined, modifiers: {} })

      vSfx.updated(el, {
        value: { hover: 'ui.hover' },
        oldValue: undefined,
        modifiers: {}
      })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).toHaveBeenCalledWith('ui.hover')
      unmount(el)
    })

    test('clearing the role on update silences the listener', () => {
      const el = mountDirective({ hover: 'ui.hover' })

      vSfx.updated(el, {
        value: {},
        oldValue: { hover: 'ui.hover' },
        modifiers: {}
      })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      unmount(el)
    })
  })

  describe('focus', () => {
    test('plays sfx on focus', () => {
      const el = mountDirective({ focus: 'ui.focus' })

      el.dispatchEvent(new Event('focus'))

      expect(emitSfx).toHaveBeenCalledWith('ui.focus')
      unmount(el)
    })

    test('does NOT play sfx on focus when no focus key configured', () => {
      const el = mountDirective({ hover: 'ui.hover' })

      el.dispatchEvent(new Event('focus'))

      expect(emitSfx).not.toHaveBeenCalled()
      unmount(el)
    })
  })

  // ── the `blur` channel is gone [obligation] ─────────────────────────────────

  describe('blur is no longer a supported channel [obligation]', () => {
    test('a `blur` key on the binding object does nothing — no listener, no emitSfx', () => {
      const el = mountDirective({ blur: 'ui.focus' })

      el.dispatchEvent(new Event('blur'))

      expect(emitSfx).not.toHaveBeenCalled()
      unmount(el)
    })

    test('the .blur modifier on a string binding does nothing', () => {
      const el = mountDirective('ui.focus', { blur: true })

      el.dispatchEvent(new Event('blur'))

      expect(emitSfx).not.toHaveBeenCalled()
      unmount(el)
    })
  })

  describe('binding shorthand', () => {
    test('string binding + .hover modifier wires hover sfx', () => {
      const el = mountDirective('ui.hover', { hover: true })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

      expect(emitHoverSfx).toHaveBeenCalledWith('ui.hover')
      unmount(el)
    })

    test('string binding + .hover modifier still filters touch', () => {
      const el = mountDirective('ui.hover', { hover: true })

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      unmount(el)
    })

    test('string binding + .focus modifier wires focus sfx', () => {
      const el = mountDirective('ui.focus', { focus: true })

      el.dispatchEvent(new Event('focus'))

      expect(emitSfx).toHaveBeenCalledWith('ui.focus')
      unmount(el)
    })

    test('a plain string binding with no modifier wires neither channel', () => {
      const el = mountDirective('ui.hover')

      el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
      el.dispatchEvent(new Event('focus'))

      expect(emitHoverSfx).not.toHaveBeenCalled()
      expect(emitSfx).not.toHaveBeenCalled()
      unmount(el)
    })
  })
})
