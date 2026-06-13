/**
 * Keeps Howler's `AudioContext` running across page visibility, focus, and
 * restoration events.
 *
 * Mobile browsers suspend the AudioContext when the tab hides or the device
 * locks; Chrome does the same after long-idle background tabs. Once
 * suspended, Howler's internal unlock flag doesn't re-fire, so subsequent
 * plays silently hang. This module re-resumes the context when the page
 * comes back, and falls back to the next user gesture on platforms that
 * require one (iOS Safari).
 */
import { Howler } from 'howler'

let installed = false
let gestureArmed = false

const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const

/**
 * Wires `visibilitychange`, `pageshow`, and `focus` listeners that call
 * `Howler.ctx.resume()`. If the browser refuses to resume without a user
 * gesture, arms a one-shot `pointerdown`/`keydown`/`touchend` listener that
 * retries on the next interaction.
 *
 * Returns a teardown function that removes every listener it registered.
 * Calling `installAudioLifecycle` while already installed is a no-op and
 * returns a no-op teardown — the original teardown remains the only way to
 * uninstall.
 */
export function installAudioLifecycle(): () => void {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  // Resume whenever the context isn't running — this covers both 'suspended'
  // and WebKit's non-standard 'interrupted' state (iOS device lock / app
  // switch), which the page never reaches via a plain 'suspended' check.
  const tryResume = async () => {
    const ctx = Howler.ctx
    if (!ctx || ctx.state === 'running') return
    try {
      await ctx.resume()
    } catch {
      armGestureRetry()
      return
    }
    if (Howler.ctx?.state !== 'running') armGestureRetry()
  }

  const gestureResume = async () => {
    removeGestureListeners()
    gestureArmed = false
    const ctx = Howler.ctx
    if (!ctx) return
    try {
      await ctx.resume()
    } catch {
      // Gesture didn't satisfy the browser; next gesture will rearm.
    }
  }

  const armGestureRetry = () => {
    if (gestureArmed) return
    gestureArmed = true
    for (const ev of GESTURE_EVENTS) {
      window.addEventListener(ev, gestureResume, { once: true, passive: true })
    }
  }

  const removeGestureListeners = () => {
    for (const ev of GESTURE_EVENTS) {
      window.removeEventListener(ev, gestureResume)
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') void tryResume()
  }

  // The context fires statechange the moment iOS interrupts it — a more direct
  // signal than waiting for the page to become visible again.
  const onStateChange = () => {
    if (Howler.ctx && Howler.ctx.state !== 'running') void tryResume()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', tryResume)
  window.addEventListener('focus', tryResume)
  Howler.ctx?.addEventListener('statechange', onStateChange)

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', tryResume)
    window.removeEventListener('focus', tryResume)
    Howler.ctx?.removeEventListener('statechange', onStateChange)
    removeGestureListeners()
    installed = false
    gestureArmed = false
  }
}
