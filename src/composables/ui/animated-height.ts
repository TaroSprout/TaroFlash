import { onBeforeUnmount, watch, type Ref } from 'vue'
import { gsap } from 'gsap'

const DURATION = 0.2

/**
 * Tween `wrapper`'s height to follow `content`'s natural height whenever the
 * content resizes — e.g. an async definition swelling a panel after it's already
 * open. `content` lives inside `wrapper`; the wrapper is clipped only for the
 * duration of each tween so it doesn't bleed at rest.
 *
 * `active` gates the tween off while something else owns the height (the footer's
 * crossfade swap drives its own height tween, so this stays out of its way and
 * just keeps its baseline in sync). The first observed size and any change while
 * inactive are recorded silently, so the next active change tweens from the right
 * baseline.
 *
 * @param wrapper - the element whose height is animated (must tolerate `overflow: hidden`).
 * @param content - the in-flow element whose natural height is the tween target.
 * @param active - returns false to record-without-animating (defaults to always on).
 * @param onSettled - called once each height tween finishes (not on silent baseline syncs).
 * @example
 * useAnimatedHeight(footer_swap, footer_term, () => !swapping, reclearSelection)
 */
export function useAnimatedHeight(
  wrapper: Ref<HTMLElement | null>,
  content: Ref<HTMLElement | null>,
  active: () => boolean = () => true,
  onSettled?: () => void
) {
  let observer: ResizeObserver | null = null
  let last = 0

  function animateTo(target: number) {
    const el = wrapper.value
    if (!el) return

    gsap.killTweensOf(el)
    // Snap to the new height instantly rather than tweening. Animating `height`
    // forces a layout recalculation on every rAF tick — with a large transcript
    // DOM this caused multi-frame jank every time the term card grew. A single
    // instant size change is one layout pass instead of twelve.
    el.style.height = `${target}px`
    requestAnimationFrame(() => {
      el.style.height = ''
      onSettled?.()
    })
  }

  function onResize() {
    const target = content.value?.offsetHeight ?? 0
    if (target === last) return

    if (active()) animateTo(target)
    last = target
  }

  watch(
    content,
    (el) => {
      observer?.disconnect()
      observer = null
      last = el?.offsetHeight ?? 0
      if (!el) return

      observer = new ResizeObserver(onResize)
      observer.observe(el)
    },
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(() => observer?.disconnect())
}
