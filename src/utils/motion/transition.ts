import type { Motion, MotionHandle } from './types'

/**
 * Wires a pair of motions into the JS hooks a `<Transition :css="false">` expects,
 * replacing the per-host enter/leave boilerplate. The driver owns `will-change`,
 * so no host sets it by hand.
 */
export function motionTransition(enter: Motion, leave: Motion) {
  const running = new WeakMap<Element, MotionHandle>()

  function drive(el: Element, motion: Motion, done: () => void) {
    running.get(el)?.cancel()

    const handle = motion(el as HTMLElement)
    running.set(el, handle)
    void handle.done.then(done)
  }

  function onEnter(el: Element, done: () => void) {
    drive(el, enter, done)
  }

  function onLeave(el: Element, done: () => void) {
    drive(el, leave, done)
  }

  return { onEnter, onLeave }
}
