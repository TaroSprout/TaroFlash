import { onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Locks background scrolling **without mutating `<html>`/`<body>` layout**.
 * Toggling `overflow`/`position` there snaps the page to scroll 0 on iOS Safari,
 * and any layout shift is visible whenever the overlay above is transparent — so
 * instead this cancels scroll-producing events (`wheel`, `touchmove`) on
 * everything outside `container`.
 *
 * Scrolls inside `container` pass through so its own content still scrolls, but
 * are blocked once its scroller reaches the edge the gesture is pushing past, so
 * the scroll never chains back to the page. The lock releases on unmount.
 *
 * @param container - the element whose scrolling stays live (e.g. the open
 *   modal). Read lazily, so it may resolve after `lock()` is first called.
 * @example
 * const { lock, unlock } = useScrollLock(() => modal_container.value?.$el)
 */
export function useScrollLock(container: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  let scroll_locked = false
  let touch_start_y = 0

  function scrollableAncestor(node: Node, root: HTMLElement): HTMLElement | null {
    let el = node instanceof HTMLElement ? node : node.parentElement
    while (el && root.contains(el)) {
      const overflow_y = getComputedStyle(el).overflowY
      if ((overflow_y === 'auto' || overflow_y === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el
      }
      el = el.parentElement
    }
    return null
  }

  function wouldScrollBackground(target: EventTarget | null, scrolling_down: boolean): boolean {
    const root = toValue(container)
    if (!root || !(target instanceof Node) || !root.contains(target)) return true

    const scroller = scrollableAncestor(target, root)
    if (!scroller) return true

    const at_top = scroller.scrollTop <= 0
    const at_bottom = Math.ceil(scroller.scrollTop + scroller.clientHeight) >= scroller.scrollHeight
    return scrolling_down ? at_bottom : at_top
  }

  function onTouchStart(e: TouchEvent) {
    touch_start_y = e.touches[0]?.clientY ?? 0
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length > 1) return // let pinch-zoom through

    const scrolling_down = (e.touches[0]?.clientY ?? 0) < touch_start_y
    if (wouldScrollBackground(e.target, scrolling_down)) e.preventDefault()
  }

  function onWheel(e: WheelEvent) {
    if (wouldScrollBackground(e.target, e.deltaY > 0)) e.preventDefault()
  }

  /** Start swallowing background scroll events. No-op if already locked. */
  function lock() {
    if (scroll_locked) return
    scroll_locked = true

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('wheel', onWheel, { passive: false })
  }

  /** Release the lock and restore normal scrolling. No-op if not locked. */
  function unlock() {
    if (!scroll_locked) return
    scroll_locked = false

    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('wheel', onWheel)
  }

  onUnmounted(unlock)

  return { lock, unlock }
}
