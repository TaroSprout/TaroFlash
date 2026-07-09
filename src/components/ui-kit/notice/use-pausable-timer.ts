import { onBeforeUnmount, watch, type Ref } from 'vue'

export interface UsePausableTimerOptions {
  delay?: number
  persist?: boolean
}

/**
 * Runs `callback` once after `delay`, pausing while the pointer rests on or
 * touches `el_ref` and resuming with whatever time was left on release.
 * Pointer events cover both cases: for touch, `pointerenter`/`pointerleave`
 * coincide with contact/release, so hover and a finger-down both map to the
 * same pause/resume pair. No-ops entirely when `persist` is set.
 */
export function usePausableTimer(
  el_ref: Ref<HTMLElement | undefined | null>,
  callback: () => void,
  options: UsePausableTimerOptions
) {
  let handle: ReturnType<typeof setTimeout> | undefined
  let remaining = options.delay ?? 0
  let started_at = 0

  function start() {
    if (options.persist || handle) return
    started_at = Date.now()
    handle = setTimeout(callback, remaining)
  }

  function pause() {
    if (!handle) return
    clearTimeout(handle)
    handle = undefined
    remaining -= Date.now() - started_at
  }

  function stop() {
    clearTimeout(handle)
    handle = undefined
  }

  watch(
    el_ref,
    (el, _prev, onCleanup) => {
      if (!el) return

      start()
      el.addEventListener('pointerenter', pause)
      el.addEventListener('pointerleave', start)
      el.addEventListener('pointercancel', start)

      onCleanup(() => {
        el.removeEventListener('pointerenter', pause)
        el.removeEventListener('pointerleave', start)
        el.removeEventListener('pointercancel', start)
      })
    },
    { immediate: true }
  )

  onBeforeUnmount(stop)

  return { stop }
}
