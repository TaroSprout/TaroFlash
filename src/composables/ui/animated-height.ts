import { onBeforeUnmount, watch, type Ref } from 'vue'
import { gsap } from 'gsap'

const DURATION = 0.2

/**
 * Follow `wrapper`'s height to `content`'s natural height whenever the content
 * resizes — e.g. an async definition swelling a panel after it's already open.
 * `content` lives inside `wrapper`; the wrapper is clipped only for the
 * duration of each change so it doesn't bleed at rest.
 *
 * `active` gates the change off while something else owns the height (the footer's
 * crossfade swap drives its own height tween, so this stays out of its way and
 * just keeps its baseline in sync). The first observed size and any change while
 * inactive are recorded silently, so the next active change starts from the right
 * baseline.
 *
 * @param wrapper - the element whose height is animated (must tolerate `overflow: hidden`).
 * @param content - the in-flow element whose natural height is the target.
 * @param active - returns false to record-without-animating (defaults to always on).
 * @param onSettled - called once each height change finishes (not on silent baseline syncs).
 * @param animate - tween `height` with GSAP instead of snapping it in one frame. Snapping
 *   (the default) dodges the multi-frame jank a real tween causes on heavy DOM (a long
 *   transcript); reach for `animate: true` only on small, cheap wrappers (e.g. a fixed footer).
 */
export function useAnimatedHeight(
  wrapper: Ref<HTMLElement | null>,
  content: Ref<HTMLElement | null>,
  active: () => boolean = () => true,
  onSettled?: () => void,
  animate = false
) {
  let observer: ResizeObserver | null = null
  let last = 0

  function animateTo(target: number) {
    const el = wrapper.value
    if (!el) return

    gsap.killTweensOf(el)

    if (animate) {
      el.style.overflow = 'hidden'
      gsap.to(el, {
        height: target,
        duration: DURATION,
        ease: 'power2.out',
        onComplete: () => {
          el.style.overflow = ''
          onSettled?.()
        }
      })
      return
    }

    // One layout pass instead of the many a tweened `height` would force on heavy DOM.
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
