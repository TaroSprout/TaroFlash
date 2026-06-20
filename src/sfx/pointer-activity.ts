/**
 * Tracks coarse pointer activity so the hover gate can tell a real hover from a
 * spurious one. A hover that fires without the pointer having moved since the
 * last click means the UI shifted under a stationary cursor (a panel opened
 * where the mouse was) — a `pointerenter` that isn't a real hover. A genuine
 * hover is always preceded by pointer movement.
 *
 * Until `trackPointerActivity()` is installed (from `installAudioLifecycle`)
 * the timestamps stay 0 and the gate reads "not stationary", so hovers play
 * normally — the safe default for SSR and for tests that import the bus alone.
 */
let last_pointer_down = 0
let last_pointer_move = 0

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0
}

/** True when no pointer movement has occurred since the last pointerdown. */
export function pointerStationaryAfterClick(): boolean {
  return last_pointer_down > 0 && last_pointer_move <= last_pointer_down
}

/** Wire passive pointer-activity listeners. Returns a teardown that removes them. */
export function trackPointerActivity(): () => void {
  if (typeof window === 'undefined') return () => {}

  const onDown = () => (last_pointer_down = now())
  const onMove = () => (last_pointer_move = now())

  window.addEventListener('pointerdown', onDown, { passive: true, capture: true })
  window.addEventListener('pointermove', onMove, { passive: true, capture: true })

  return () => {
    window.removeEventListener('pointerdown', onDown, { capture: true })
    window.removeEventListener('pointermove', onMove, { capture: true })
  }
}
