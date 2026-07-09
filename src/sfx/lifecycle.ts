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

// Calling context.resume() before any user gesture has happened is exactly what
// autoplay-blocking browsers reject — and Chrome logs a console warning about it
// natively, even though we handle the rejection. Skip the speculative call
// until a real gesture is on record; the gesture-armed listener still unlocks
// on first tap regardless. Unsupported in Safari, where resume() before a
// gesture was already unreliable — this only removes a call that wasn't doing
// anything useful there either.
function hasUserActivation(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation
      ?.hasBeenActive === true
  )
}

/**
 * Wires `visibilitychange`, `pageshow`, `focus`, and context `statechange`
 * listeners that resume the engine, plus a one-shot `touchend`/`click`/`keydown`
 * listener that unlocks (and, if needed, rebuilds) the context on the next
 * interaction.
 *
 * `onSuspectedDesync` fires when a hidden→visible return finds the context
 * reporting 'running' with a frozen `currentTime` — the state-lie this module
 * works around. Diagnostic only, so a caller (App.vue) can surface it to a
 * toast; the recovery itself doesn't wait on or need this.
 *
 * Returns a teardown function that removes every listener it registered.
 * Calling `installAudioLifecycle` while already installed is a no-op and returns
 * a no-op teardown — the original teardown remains the only way to uninstall.
 */
export function installAudioLifecycle(onSuspectedDesync?: () => void): () => void {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  let forced_unlock = false
  let was_hidden = false

  // Arm the gesture retry up front whenever the context isn't running, then try
  // an opportunistic resume. Crucially we do NOT gate arming on the resume
  // result: a browser that blocks autoplay leaves `resume()` pending forever
  // (it never resolves to tell us it failed), so awaiting it would mean the
  // gesture listener — the only thing that actually unlocks audio — never gets
  // armed. The resume is fire-and-forget; the gesture is what we rely on.
  const recover = () => {
    if (engine.state() === 'running') return
    armGestureRetry(false)
    if (hasUserActivation()) void engine.resume()
  }

  // iOS can report the context as 'running' after an app-switch even though the
  // audio hardware is actually dead — state can't be trusted on the way back
  // from background. Skip the `state === 'running'` short-circuit entirely: arm
  // the gesture retry unconditionally and force a full rebuild on the next tap.
  const recoverFromBackground = () => {
    armGestureRetry(true)
    if (hasUserActivation()) void engine.resume()
    void diagnoseLiveness()
  }

  const diagnoseLiveness = async () => {
    const alive = await engine.probeLiveness()
    if (!alive) onSuspectedDesync?.()
  }

  // Synchronous so the unlock's priming source + resume() fire inside the
  // gesture — iOS ignores them otherwise. engine.unlock() owns the resume/rebuild
  // dance; we just hand off the gesture.
  const gestureRecover = () => {
    removeGestureListeners()
    gesture_armed = false
    engine.unlock(forced_unlock)
    forced_unlock = false
  }

  // Capture phase, not bubble: handlers like the dropdown caret's `@click.stop`
  // swallow propagation before the event reaches `window` in the bubble phase,
  // so a bubble-phase listener would miss those gestures and leave audio locked.
  // Capture runs window→target first, ahead of any descendant's stopPropagation.
  const armGestureRetry = (force: boolean) => {
    if (force) forced_unlock = true
    if (gesture_armed) return
    gesture_armed = true
    for (const ev of GESTURE_EVENTS) {
      window.addEventListener(ev, gestureRecover, { once: true, passive: true, capture: true })
    }
  }

  const removeGestureListeners = () => {
    for (const ev of GESTURE_EVENTS) {
      window.removeEventListener(ev, gestureRecover, { capture: true })
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      was_hidden = true
      return
    }

    if (was_hidden) {
      was_hidden = false
      recoverFromBackground()
    } else {
      recover()
    }
  }

  // `persisted` marks a bfcache restore — Safari can serve one after an
  // app-switch instead of a fresh load, which is the same state-lie risk as
  // the visibilitychange path above.
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted || was_hidden) {
      was_hidden = false
      recoverFromBackground()
    } else {
      recover()
    }
  }

  // statechange fires the moment iOS interrupts the context — a more direct
  // signal than waiting for the page to become visible again.
  const onStateChange = () => {
    if (engine.state() !== 'running') recover()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('focus', recover)
  const offStateChange = engine.onStateChange(onStateChange)
  const offPointerActivity = trackPointerActivity()

  // Arm now so the first user gesture unlocks the freshly-created (suspended)
  // context, the same way Howler's global unlock handler used to.
  recover()

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('focus', recover)
    offStateChange()
    offPointerActivity()
    removeGestureListeners()
    installed = false
    gesture_armed = false
  }
}
