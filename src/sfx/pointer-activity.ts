/**
 * Remembers when the pointer last moved and last pressed, so a hover sound can
 * tell a real hover from the UI shifting under a still cursor.
 *
 * Uninstalled, this reports "moving", so hovers play normally — the safe
 * default for tests importing the bus on its own.
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
