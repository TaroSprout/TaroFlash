import { inject, onBeforeUnmount, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

type AnchorSource = Readonly<Ref<HTMLElement | null>>

type PageAnchor = {
  inset: Ref<number | null>
  claim: (source: AnchorSource) => void
}

const page_anchor_key = Symbol('page-anchor') as InjectionKey<PageAnchor>

/**
 * How far in from the window's right edge an element's own right edge sits.
 *
 * Added up from the element's layout offsets rather than read off a bounding
 * rect, because a pane is often still sliding in from the side when this runs —
 * a rect would report where the slide currently holds it instead of where it
 * comes to rest, and nothing measures again once the slide clears.
 */
function rightInset(el: HTMLElement) {
  let right = el.offsetWidth
  let node: HTMLElement | null = el

  while (node) {
    right += node.offsetLeft
    node = node.offsetParent as HTMLElement | null
  }

  // clientWidth, not innerWidth: innerWidth counts a classic scrollbar as page space.
  return document.documentElement.clientWidth - right
}

/**
 * How far in from the window's right edge the page scrollbar hangs.
 *
 * Null whenever nothing on screen has claimed it, which leaves the scrollbar
 * beside the page column at its stylesheet default. A pane that caps its own
 * content narrower than that column claims it so the scrollbar follows the
 * content instead of stranding itself in the empty space beside it.
 */
export function providePageAnchor() {
  const inset = ref<number | null>(null)

  let el: HTMLElement | null = null
  let obs: ResizeObserver | null = null
  let frame = 0

  function measure() {
    if (!el) {
      inset.value = null
      return
    }

    inset.value = rightInset(el)
  }

  function schedule() {
    if (frame) return

    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  function setAnchor(next: HTMLElement | null) {
    obs?.disconnect()
    el = next

    if (el) {
      obs ??= new ResizeObserver(schedule)
      obs.observe(el)
    }

    measure()
  }

  function claim(source: AnchorSource) {
    watch(source, (next) => setAnchor(next ?? null), { immediate: true, flush: 'post' })

    onBeforeUnmount(() => setAnchor(null))
  }

  // A capped column's box never changes as the window widens, so the window reports the move.
  window.addEventListener('resize', schedule, { passive: true })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)

    obs?.disconnect()
    obs = null
  })

  provide(page_anchor_key, { inset, claim })

  return { inset }
}

/** Hands the page scrollbar an element's right edge to hang beside, while that element is mounted. */
export function usePageAnchorClaim(source: AnchorSource) {
  inject(page_anchor_key, null)?.claim(source)
}
