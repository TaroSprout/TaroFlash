/**
 * Keeps the SFX AudioContext alive across page visibility, focus, and audio
 * interruptions.
 *
 * Mobile browsers suspend the context when the tab hides or the device locks;
 * iOS goes further and drops it into WebKit's non-standard 'interrupted' state
 * (device lock / app switch / a call), which a plain `resume()` often can't
 * revive. This module resumes on every wake signal, and arms a one-shot gesture
 * listener that hands off to `engine.unlock()` — which rebuilds the context
 * inside the gesture, the only reliable cure for 'interrupted'.
 */
import engine from '@/sfx/engine'
import { trackPointerActivity } from '@/sfx/pointer-activity'

let installed = false
let gesture_armed = false

// iOS only treats a *completed* gesture as audio-activating — touchend / click,
// never touchstart / pointerdown. Listening on pointerdown unlocks on an event
// iOS ignores, so audio stays muted.
const GESTURE_EVENTS = ['touchend', 'click', 'keydown'] as const

/**
 * Wires `visibilitychange`, `pageshow`, `focus`, and context `statechange`
 * listeners that resume the engine, plus a one-shot `touchend`/`click`/`keydown`
 * listener that unlocks (and, if needed, rebuilds) the context on the next
 * interaction.
 *
 * Returns a teardown function that removes every listener it registered.
 * Calling `installAudioLifecycle` while already installed is a no-op and returns
 * a no-op teardown — the original teardown remains the only way to uninstall.
 */
export function installAudioLifecycle(): () => void {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  // Arm the gesture retry up front whenever the context isn't running, then try
  // an opportunistic resume. Crucially we do NOT gate arming on the resume
  // result: a browser that blocks autoplay leaves `resume()` pending forever
  // (it never resolves to tell us it failed), so awaiting it would mean the
  // gesture listener — the only thing that actually unlocks audio — never gets
  // armed. The resume is fire-and-forget; the gesture is what we rely on.
  const recover = () => {
    if (engine.state() === 'running') return
    armGestureRetry()
    void engine.resume()
  }

  // Synchronous so the unlock's priming source + resume() fire inside the
  // gesture — iOS ignores them otherwise. engine.unlock() owns the resume/rebuild
  // dance; we just hand off the gesture.
  const gestureRecover = () => {
    removeGestureListeners()
    gesture_armed = false
    engine.unlock()
  }

  const armGestureRetry = () => {
    if (gesture_armed) return
    gesture_armed = true
    for (const ev of GESTURE_EVENTS) {
      window.addEventListener(ev, gestureRecover, { once: true, passive: true })
    }
  }

  const removeGestureListeners = () => {
    for (const ev of GESTURE_EVENTS) {
      window.removeEventListener(ev, gestureRecover)
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') recover()
  }

  // statechange fires the moment iOS interrupts the context — a more direct
  // signal than waiting for the page to become visible again.
  const onStateChange = () => {
    if (engine.state() !== 'running') recover()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', recover)
  window.addEventListener('focus', recover)
  const offStateChange = engine.onStateChange(onStateChange)
  const offPointerActivity = trackPointerActivity()

  // Arm now so the first user gesture unlocks the freshly-created (suspended)
  // context, the same way Howler's global unlock handler used to.
  recover()

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', recover)
    window.removeEventListener('focus', recover)
    offStateChange()
    offPointerActivity()
    removeGestureListeners()
    installed = false
    gesture_armed = false
  }
}
