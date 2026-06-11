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
 * @example
 * useAnimatedHeight(footer_swap, footer_term, () => !swapping)
 */
export function useAnimatedHeight(
  wrapper: Ref<HTMLElement | null>,
  content: Ref<HTMLElement | null>,
  active: () => boolean = () => true
) {
  let observer: ResizeObserver | null = null
  let last = 0

  function animateTo(target: number) {
    const el = wrapper.value
    if (!el) return

    gsap.killTweensOf(el)
    // Pin the content to the bottom while the height tweens: the clip then eats
    // into the top and reveals downward, so a bottom-anchored panel (the footer)
    // keeps its trailing element — e.g. the play button — still as it grows.
    el.style.overflow = 'hidden'
    el.style.display = 'flex'
    el.style.flexDirection = 'column'
    el.style.justifyContent = 'flex-end'
    el.style.height = `${last}px`
    gsap.to(el, {
      height: target,
      duration: DURATION,
      ease: 'power2.out',
      onComplete: () => {
        el.style.height = ''
        el.style.overflow = ''
        el.style.display = ''
        el.style.flexDirection = ''
        el.style.justifyContent = ''
      }
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
