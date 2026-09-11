import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getCurrentScope, onScopeDispose } from 'vue'
import { useMotionStore } from '@/stores/motion'

gsap.registerPlugin(ScrollTrigger)

// Base delay between consecutive cards, before the active tier's stagger factor scales it. On the
// minimal tier that factor is 0, so every card in a group wakes together instead of in sequence.
const FEATURE_STAGGER = 0.12

// The band of the screen a row has to reach to come alive. Deliberately
// lopsided — cards stay awake a little longer on the way down.
const BAND_TOP = '25%'
const BAND_BOTTOM = '60%'

export interface FeatureReveal {
  /** Stops the scroll trigger and cancels any staggered flips still waiting to fire. */
  kill(): void
}

/**
 * Wakes a group of welcome-page cards one after another as they scroll into
 * the middle of the screen, and puts them back to sleep on the way out. The
 * stagger runs through the shared motion tier, so a weaker device wakes the
 * cards with less delay between them, or all at once.
 *
 * @param indices - The cards this trigger owns, woken in the order given.
 *   How the page is grouped varies by screen size.
 * @param setActive - What waking means here: turning a card over, or
 *   revealing one from a stack.
 * @returns A handle the caller must `kill()` on unmount.
 */
export function createFeatureReveal(
  trigger: Element,
  indices: number[],
  setActive: (index: number, active: boolean) => void
): FeatureReveal {
  const stagger = FEATURE_STAGGER * useMotionStore().factors.stagger

  // Every scheduled flip still waiting, so kill() can cancel them — a ScrollTrigger's own kill() stops its listeners but leaves its delayed calls to fire into an unmounted page.
  const pending = new Set<gsap.core.Tween>()

  const apply = (active: boolean) =>
    indices.forEach((index, order) => {
      const call = gsap.delayedCall(order * stagger, () => {
        pending.delete(call)
        setActive(index, active)
      })
      pending.add(call)
    })

  const scroll_trigger = ScrollTrigger.create({
    trigger,
    start: `top ${BAND_BOTTOM}`,
    end: `bottom ${BAND_TOP}`,
    onEnter: () => apply(true),
    onLeave: () => apply(false),
    onEnterBack: () => apply(true),
    onLeaveBack: () => apply(false)
  })

  function kill() {
    scroll_trigger.kill()
    for (const call of pending) call.kill()
    pending.clear()
  }

  // Auto-cleanup only fires when this is built inside a scope; the welcome section builds it outside one, so it drives kill() itself on resize and unmount, mirroring the motion driver's handle.
  if (getCurrentScope()) onScopeDispose(kill)

  return { kill }
}
