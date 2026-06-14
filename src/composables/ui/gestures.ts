import { getCurrentScope, onScopeDispose } from 'vue'

export interface DragCoords {
  x: number
  y: number
  dx: number // Delta from drag start
  dy: number // Delta from drag start
}

export interface DragResult extends DragCoords {
  velocity: number // pixels per millisecond
  duration: number // milliseconds
}

export interface DragCallbacks {
  /** Fires when the pointer first contacts the element. */
  onStart?: (coords: { x: number; y: number }) => void
  /** Fires on every move event while the drag is in progress. */
  onMove?: (coords: DragCoords) => void
  /** Fires when the pointer is released. */
  onEnd?: (result: DragResult) => void
  /** Fires when the pointer is cancelled (e.g. browser gesture takeover). */
  onCancel?: () => void
}

// ── Module-level state ────────────────────────────────────────────────────────
// Single shared state so N components share one set of document listeners.

interface Registration {
  id: number
  element: Element
  callbacks: DragCallbacks
}

interface Tracking {
  start_x: number
  start_y: number
  start_time: number
  pointer_id: number
  active: Registration[]
}

let _next_id = 0
const _registry = new Map<number, Registration>()
let _tracking: Tracking | null = null
let _listener_count = 0

// ── Global pointer event handlers ─────────────────────────────────────────────

function onPointerDown(e: PointerEvent): void {
  if (_tracking) return

  const target = e.target as Element | null
  if (!target) return

  const active = [..._registry.values()].filter((r) => r.element.contains(target))
  if (active.length === 0) return

  target.setPointerCapture?.(e.pointerId)
  _tracking = {
    start_x: e.clientX,
    start_y: e.clientY,
    start_time: Date.now(),
    pointer_id: e.pointerId,
    active
  }

  const coords = { x: e.clientX, y: e.clientY }
  for (const r of active) r.callbacks.onStart?.(coords)
}

function onPointerMove(e: PointerEvent): void {
  if (!_tracking || _tracking.pointer_id !== e.pointerId) return

  e.preventDefault()

  const dx = e.clientX - _tracking.start_x
  const dy = e.clientY - _tracking.start_y
  const coords: DragCoords = { x: e.clientX, y: e.clientY, dx, dy }

  for (const r of _tracking.active) r.callbacks.onMove?.(coords)
}

function onPointerUp(e: PointerEvent): void {
  if (!_tracking || _tracking.pointer_id !== e.pointerId) return

  const dx = e.clientX - _tracking.start_x
  const dy = e.clientY - _tracking.start_y
  const duration = Date.now() - _tracking.start_time
  const velocity = duration > 0 ? Math.sqrt(dx * dx + dy * dy) / duration : 0

  const active = _tracking.active
  _tracking = null

  const result: DragResult = { x: e.clientX, y: e.clientY, dx, dy, velocity, duration }
  for (const r of active) r.callbacks.onEnd?.(result)

  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    const elements = active.map((r) => r.element)
    const handler = (clickEvent: Event) => {
      const target = clickEvent.target as Node | null
      if (target && elements.some((el) => el.contains(target))) {
        clickEvent.stopPropagation()
      }
      document.removeEventListener('click', handler, { capture: true })
      clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      document.removeEventListener('click', handler, { capture: true })
    }, 350)
    document.addEventListener('click', handler, { capture: true })
  }
}

function onPointerCancel(e: PointerEvent): void {
  if (!_tracking || _tracking.pointer_id !== e.pointerId) return
  const active = _tracking.active
  _tracking = null
  for (const r of active) r.callbacks.onCancel?.()
}

// ── Listener lifecycle ────────────────────────────────────────────────────────

function attachListeners(): void {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('pointermove', onPointerMove, { passive: false })
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointercancel', onPointerCancel)
}

function detachListeners(): void {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointercancel', onPointerCancel)
}

// ── Test utilities ────────────────────────────────────────────────────────────

/** Reset all module-level state. Call in beforeEach in tests. */
export function _resetGestureState(): void {
  if (_listener_count > 0) detachListeners()
  _registry.clear()
  _tracking = null
  _listener_count = 0
  _next_id = 0
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useGestures() {
  /**
   * Attach drag tracking to an element. All pointer events are captured at
   * the document level, so callbacks fire even when the pointer leaves the
   * element's bounds mid-drag.
   *
   * Returns an unregister function. Auto-unregisters when the component
   * scope is disposed.
   */
  function register(element: Element, callbacks: DragCallbacks): () => void {
    const el = element as HTMLElement
    const prev_touch_action = el.style.touchAction
    el.style.touchAction = 'none'

    const id = _next_id++
    _registry.set(id, { id, element, callbacks })
    _listener_count++
    if (_listener_count === 1) attachListeners()

    function unregister() {
      if (!_registry.has(id)) return
      el.style.touchAction = prev_touch_action
      _registry.delete(id)
      if (_tracking) {
        _tracking.active = _tracking.active.filter((r) => r.id !== id)
        if (_tracking.active.length === 0) _tracking = null
      }
      _listener_count--
      if (_listener_count === 0) detachListeners()
    }

    if (getCurrentScope()) onScopeDispose(unregister)
    return unregister
  }

  return { register }
}
