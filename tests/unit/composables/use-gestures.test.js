import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { useGestures, _resetGestureState } from '@/composables/ui/gestures'

// jsdom doesn't implement PointerEvent — extend MouseEvent with the fields we need
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeElement() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function cleanup(el) {
  el.remove()
}

let pointer_id = 0

function pointerDown(target, x, y) {
  const e = new PointerEvent('pointerdown', {
    bubbles: true,
    clientX: x,
    clientY: y,
    pointerId: ++pointer_id
  })
  target.dispatchEvent(e)
  return pointer_id
}

function pointerMove(x, y, pid = pointer_id) {
  document.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerId: pid })
  )
}

function pointerUp(x, y, pid = pointer_id) {
  document.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: pid })
  )
}

function pointerCancel(pid = pointer_id) {
  document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: pid }))
}

/** Simulate a complete drag: down → move halfway → up. */
function drag(target, dx, dy) {
  const start_x = 100
  const start_y = 100
  pointerDown(target, start_x, start_y)
  pointerMove(start_x + dx / 2, start_y + dy / 2)
  pointerUp(start_x + dx, start_y + dy)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useGestures', () => {
  let el

  beforeEach(() => {
    _resetGestureState()
    pointer_id = 0
    el = makeElement()
  })

  afterEach(() => {
    cleanup(el)
  })

  // ── onStart ───────────────────────────────────────────────────────────────

  test('onStart fires with pointer coordinates when drag begins', () => {
    const onStart = vi.fn()
    const { register } = useGestures()
    register(el, { onStart })

    pointerDown(el, 150, 200)

    expect(onStart).toHaveBeenCalledOnce()
    expect(onStart.mock.calls[0][0]).toEqual({ x: 150, y: 200 })
  })

  test('onStart does not fire for touches outside the element', () => {
    const onStart = vi.fn()
    const { register } = useGestures()
    register(el, { onStart })

    const other = makeElement()
    pointerDown(other, 100, 100)
    cleanup(other)

    expect(onStart).not.toHaveBeenCalled()
  })

  // ── onMove ────────────────────────────────────────────────────────────────

  test('onMove fires for every move event during the drag', () => {
    const onMove = vi.fn()
    const { register } = useGestures()
    register(el, { onMove })

    pointerDown(el, 100, 100)
    pointerMove(120, 100)
    pointerMove(140, 100)
    pointerMove(160, 100)

    expect(onMove).toHaveBeenCalledTimes(3)
  })

  test('onMove provides current position and deltas from start', () => {
    const onMove = vi.fn()
    const { register } = useGestures()
    register(el, { onMove })

    pointerDown(el, 100, 100)
    pointerMove(150, 110)

    expect(onMove.mock.calls[0][0]).toEqual({ x: 150, y: 110, dx: 50, dy: 10 })
  })

  test('onMove does not fire for events on an unrelated pointer', () => {
    const onMove = vi.fn()
    const { register } = useGestures()
    register(el, { onMove })

    pointerDown(el, 100, 100)
    pointerMove(120, 100, pointer_id + 99) // wrong pointer id

    expect(onMove).not.toHaveBeenCalled()
  })

  // ── onEnd ─────────────────────────────────────────────────────────────────

  test('onEnd fires on pointer up with dx, dy, velocity, duration', () => {
    const onEnd = vi.fn()
    const { register } = useGestures()
    register(el, { onEnd })

    drag(el, 80, 30)

    expect(onEnd).toHaveBeenCalledOnce()
    const result = onEnd.mock.calls[0][0]
    expect(result.dx).toBe(80)
    expect(result.dy).toBe(30)
    expect(typeof result.velocity).toBe('number')
    expect(typeof result.duration).toBe('number')
    expect(result.velocity).toBeGreaterThanOrEqual(0)
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  test('onEnd fires for any drag, regardless of distance or direction', () => {
    const onEnd = vi.fn()
    const { register } = useGestures()
    register(el, { onEnd })

    drag(el, 5, 5) // tiny diagonal drag
    expect(onEnd).toHaveBeenCalledOnce()
  })

  test('onEnd fires with correct coordinates when released outside the element', () => {
    const onEnd = vi.fn()
    const { register } = useGestures()
    register(el, { onEnd })

    pointerDown(el, 100, 100)
    pointerUp(500, 500) // far outside element bounds

    expect(onEnd).toHaveBeenCalledOnce()
    const result = onEnd.mock.calls[0][0]
    expect(result.dx).toBe(400)
    expect(result.dy).toBe(400)
  })

  // ── onCancel ──────────────────────────────────────────────────────────────

  test('onCancel fires on pointercancel and clears tracking', () => {
    const onCancel = vi.fn()
    const onEnd = vi.fn()
    const { register } = useGestures()
    register(el, { onCancel, onEnd })

    pointerDown(el, 100, 100)
    pointerCancel()

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onEnd).not.toHaveBeenCalled()
  })

  test('a fresh drag works normally after a pointercancel', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const { register } = useGestures()
    register(el, { onStart, onEnd })

    pointerDown(el, 100, 100)
    pointerCancel()

    pointerDown(el, 100, 100)
    pointerUp(200, 100)

    expect(onStart).toHaveBeenCalledTimes(2)
    expect(onEnd).toHaveBeenCalledOnce()
  })

  // ── Element containment ───────────────────────────────────────────────────

  test('callbacks fire when the touch target is a child of the registered element', () => {
    const onEnd = vi.fn()
    const child = document.createElement('span')
    el.appendChild(child)

    const { register } = useGestures()
    register(el, { onEnd })

    drag(child, 80, 0)

    expect(onEnd).toHaveBeenCalledOnce()
  })

  test('callbacks do not fire when the touch target is a sibling element', () => {
    const onEnd = vi.fn()
    const sibling = makeElement()

    const { register } = useGestures()
    register(el, { onEnd })

    drag(sibling, 80, 0)
    cleanup(sibling)

    expect(onEnd).not.toHaveBeenCalled()
  })

  // ── Multiple registrations ─────────────────────────────────────────────────

  test('two registrations on the same element both receive callbacks', () => {
    const onEnd1 = vi.fn()
    const onEnd2 = vi.fn()
    const { register } = useGestures()
    register(el, { onEnd: onEnd1 })
    register(el, { onEnd: onEnd2 })

    drag(el, 80, 0)

    expect(onEnd1).toHaveBeenCalledOnce()
    expect(onEnd2).toHaveBeenCalledOnce()
  })

  test('registrations on different elements are independent', () => {
    const el2 = makeElement()
    const onEnd1 = vi.fn()
    const onEnd2 = vi.fn()
    const { register } = useGestures()
    register(el, { onEnd: onEnd1 })
    register(el2, { onEnd: onEnd2 })

    drag(el, 80, 0)

    expect(onEnd1).toHaveBeenCalledOnce()
    expect(onEnd2).not.toHaveBeenCalled()

    cleanup(el2)
  })

  // ── Listener sharing ──────────────────────────────────────────────────────

  test('document listeners are attached only once for multiple registrations', () => {
    const add_spy = vi.spyOn(document, 'addEventListener')
    const { register } = useGestures()
    register(el, {})
    register(el, {})
    register(el, {})

    // 4 listeners (down, move, up, cancel) attached exactly once
    expect(add_spy).toHaveBeenCalledTimes(4)

    add_spy.mockRestore()
  })

  // ── Unregister ────────────────────────────────────────────────────────────

  test('returned unregister function stops callbacks from firing', () => {
    const onEnd = vi.fn()
    const { register } = useGestures()
    const unregister = register(el, { onEnd })

    unregister()
    drag(el, 80, 0)

    expect(onEnd).not.toHaveBeenCalled()
  })

  test('document listeners are detached when all registrations are removed', () => {
    const remove_spy = vi.spyOn(document, 'removeEventListener')
    const { register } = useGestures()
    const unregister = register(el, {})

    unregister()

    expect(remove_spy).toHaveBeenCalled()
    remove_spy.mockRestore()
  })

  // ── touchAction management ────────────────────────────────────────────────

  test('register sets touchAction to none on the element', () => {
    const { register } = useGestures()
    register(el, {})

    expect(el.style.touchAction).toBe('none')
  })

  test('unregister restores the previous touchAction value', () => {
    el.style.touchAction = 'pan-y'
    const { register } = useGestures()
    const unregister = register(el, {})

    unregister()

    expect(el.style.touchAction).toBe('pan-y')
  })

  test('unregister restores to empty/unset when touchAction was not set', () => {
    const { register } = useGestures()
    const unregister = register(el, {})

    unregister()

    // jsdom may return undefined or '' for a never-set property — either means "unset"
    expect(el.style.touchAction || '').toBe('')
  })

  // ── Click suppression after drag ──────────────────────────────────────────

  test('suppresses click that fires on the dragged element after a drag > 4px', () => {
    const onClick = vi.fn()
    document.addEventListener('click', onClick)

    const { register } = useGestures()
    register(el, {})

    pointerDown(el, 100, 100)
    pointerUp(110, 100) // 10px drag — above threshold

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClick).not.toHaveBeenCalled()
    document.removeEventListener('click', onClick)
  })

  test('suppresses click on a child of the dragged element after a drag > 4px', () => {
    const onClick = vi.fn()
    const child = document.createElement('span')
    el.appendChild(child)
    document.addEventListener('click', onClick)

    const { register } = useGestures()
    register(el, {})

    pointerDown(el, 100, 100)
    pointerUp(110, 100)

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClick).not.toHaveBeenCalled()
    document.removeEventListener('click', onClick)
  })

  test('does NOT suppress click on an element outside the dragged element', () => {
    const onClick = vi.fn()
    const outside = makeElement()
    document.addEventListener('click', onClick)

    const { register } = useGestures()
    register(el, {})

    pointerDown(el, 100, 100)
    pointerUp(110, 100) // drag on `el`

    // user immediately taps a different element (e.g. modal close button)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClick).toHaveBeenCalledOnce()
    cleanup(outside)
    document.removeEventListener('click', onClick)
  })

  test('does not suppress click after a drag of 4px or less', () => {
    const onClick = vi.fn()
    document.addEventListener('click', onClick)

    const { register } = useGestures()
    register(el, {})

    pointerDown(el, 100, 100)
    pointerUp(104, 100) // exactly 4px — at threshold, not above

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClick).toHaveBeenCalledOnce()
    document.removeEventListener('click', onClick)
  })

  test('suppression listener is cleared after the timeout window so later clicks pass', () => {
    vi.useFakeTimers()
    const onClick = vi.fn()
    document.addEventListener('click', onClick)

    const { register } = useGestures()
    register(el, {})

    pointerDown(el, 100, 100)
    pointerUp(110, 100)

    vi.advanceTimersByTime(400) // > 350ms cleanup window

    // a later click on the dragged element should now go through
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClick).toHaveBeenCalledOnce()
    document.removeEventListener('click', onClick)
    vi.useRealTimers()
  })

  test('suppression handler self-removes after the synthetic click fires', () => {
    const onClick = vi.fn()
    document.addEventListener('click', onClick)

    const { register } = useGestures()
    register(el, {})

    pointerDown(el, 100, 100)
    pointerUp(110, 100)

    // first click on the dragged element — suppressed
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()

    // second click on the dragged element — handler already removed, passes through
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledOnce()

    document.removeEventListener('click', onClick)
  })
})
