/**
 * Brings sound back after the tab hides, the device locks, or another app takes
 * over. →[K:ios-audio-interruption]
 */
import engine from '@/sfx/engine'
import { trackPointerActivity } from '@/sfx/pointer-activity'

let installed = false
let gesture_armed = false

// Never swap in a press event — only a completed gesture reactivates audio.
// →[K:ios-audio-interruption]
const GESTURE_EVENTS = ['touchend', 'click', 'keydown'] as const

// How long to leave an unlock attempt to land before re-arming for the next one.
const UNLOCK_CHECK_MS = 300

/**
 * Whether the user has interacted with this page at any point.
 *
 * Gate every speculative resume behind it — resuming before the first
 * interaction is what autoplay blockers reject. →[K:ios-audio-interruption]
 * Safari doesn't implement it, so this reads false there and the gesture
 * listener does all the work.
 */
function hasUserActivation(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation
      ?.hasBeenActive === true
  )
}

/**
 * Starts watching for the page waking up, and repairs audio on the next tap.
 *
 * A second call while already installed does nothing and hands back a no-op —
 * the teardown from the first call stays the only way to uninstall.
 *
 * @returns A teardown that removes every listener registered here.
 */
export function installAudioLifecycle(): () => void {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  let forced_unlock = false
  let was_hidden = false
  let was_blurred = false

  // Arm before resuming, and never await the resume — a blocked one stays
  // pending forever, so the gesture listener would never get armed at all.
  const recover = () => {
    if (engine.state() === 'running') return
    armGestureRetry(false)
    if (hasUserActivation()) void engine.resume()
  }

  // Force the rebuild here rather than checking state first — coming back from
  // the background, the context lies about being healthy.
  // →[K:ios-audio-interruption]
  const recoverFromBackground = () => {
    armGestureRetry(true)
    if (hasUserActivation()) void engine.resume()
  }

  // Keep this synchronous — an await here pushes the rebuild outside the
  // gesture, where it no longer counts. →[K:ios-audio-interruption]
  const gestureRecover = () => {
    removeGestureListeners()
    gesture_armed = false
    engine.unlock(forced_unlock)
    forced_unlock = false

    // Don't rely on the confirming `statechange` alone — heavy work sharing
    // this gesture can starve it, leaving nothing to re-arm on and audio dead
    // for the rest of the visit.
    setTimeout(() => {
      if (!engine.isUnlocked()) armGestureRetry(false)
    }, UNLOCK_CHECK_MS)
  }

  // Keep these on the capture phase — a control that stops propagation would
  // otherwise swallow the one tap that restores sound.
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

  const onBlur = () => {
    was_blurred = true
  }

  // A window regaining focus after losing it is an interruption — never route
  // it through `recover`, which trusts the context's own account of itself.
  // →[K:ios-audio-interruption]
  const onFocus = () => {
    if (was_blurred) {
      was_blurred = false
      recoverFromBackground()
    } else {
      recover()
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

  // Treat a restored page (`persisted`) as a background return — Safari serves
  // one after an app-switch instead of a fresh load.
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted || was_hidden) {
      was_hidden = false
      recoverFromBackground()
    } else {
      recover()
    }
  }

  // Catches an interruption the moment it happens, rather than waiting for the
  // page to become visible again.
  const onStateChange = () => {
    if (engine.state() !== 'running') recover()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('blur', onBlur)
  window.addEventListener('focus', onFocus)
  const offStateChange = engine.onStateChange(onStateChange)
  const offPointerActivity = trackPointerActivity()

  // Arm now, so the very first tap of the visit unlocks the new context.
  recover()

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', onFocus)
    offStateChange()
    offPointerActivity()
    removeGestureListeners()
    installed = false
    gesture_armed = false
    was_blurred = false
  }
}
