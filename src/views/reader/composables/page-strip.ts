import { computed, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useMotionStore } from '@/stores/motion'
import { slideScroller } from '@/utils/animations/page-strip'

const SCROLL_IDLE_MS = 80
const ALIGN_SLOP = 2

export type PageStripOptions = {
  scroller: Readonly<ShallowRef<HTMLElement | null>>
  spread_count: MaybeRefOrGetter<number>
  item_size: MaybeRefOrGetter<number>
  desired_spread: MaybeRefOrGetter<number>
  onTurn: (spread: number) => void
}

export type PageStrip = {
  virtualizer: ReturnType<typeof useVirtualizer<HTMLElement, HTMLElement>>
  displayed_spread: Ref<number>
  at_rest: Ref<boolean>
}

export function usePageStrip(options: PageStripOptions): PageStrip {
  const { scroller, spread_count, item_size, desired_spread, onTurn } = options

  const motion = useMotionStore()

  const desired = toValue(desired_spread)
  const initial_spread = clampSpread(desired)
  const displayed_spread = ref(initial_spread)
  const at_rest = ref(true)

  let internal = false
  let sliding = false
  let idle_timer: ReturnType<typeof setTimeout> | undefined

  const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(
    computed(() => ({
      count: toValue(spread_count),
      horizontal: true,
      getScrollElement: () => scroller.value,
      estimateSize: () => toValue(item_size),
      overscan: 1
    }))
  )

  onMounted(() => {
    const el = scroller.value
    if (!el) return

    el.addEventListener('scroll', onScroll, { passive: true })
    recenter()
  })

  onBeforeUnmount(() => {
    clearTimeout(idle_timer)
    scroller.value?.removeEventListener('scroll', onScroll)
  })

  function clampSpread(index: number): number {
    const last = toValue(spread_count) - 1
    if (last < 0) return 0
    return Math.min(Math.max(index, 0), last)
  }

  function recenter() {
    const el = scroller.value
    if (!el) return

    internal = true
    el.scrollLeft = displayed_spread.value * toValue(item_size)
    requestAnimationFrame(() => (internal = false))
  }

  function goTo(target: number) {
    const el = scroller.value
    const clamped = clampSpread(target)
    if (!el || clamped === displayed_spread.value) return

    const to = clamped * toValue(item_size)
    const step = Math.abs(clamped - displayed_spread.value)

    if (motion.prefers_reduced_motion || step !== 1) {
      jumpTo(el, clamped, to)
      return
    }

    slide(el, clamped, to)
  }

  function jumpTo(el: HTMLElement, spread: number, to: number) {
    internal = true
    el.scrollLeft = to
    displayed_spread.value = spread
    requestAnimationFrame(() => (internal = false))
  }

  function slide(el: HTMLElement, spread: number, to: number) {
    if (sliding) return

    sliding = true
    internal = true
    el.style.scrollSnapType = 'none'

    slideScroller(el, to, () => {
      el.style.scrollSnapType = ''
      displayed_spread.value = spread
      sliding = false
      requestAnimationFrame(() => (internal = false))
    })
  }

  function onScroll() {
    if (internal) return

    at_rest.value = false
    clearTimeout(idle_timer)
    idle_timer = setTimeout(commitScroll, SCROLL_IDLE_MS)
  }

  function commitScroll() {
    const el = scroller.value
    const size = toValue(item_size)
    if (!el || size <= 0) return

    const slot = Math.round(el.scrollLeft / size)
    if (Math.abs(el.scrollLeft - slot * size) > ALIGN_SLOP) {
      idle_timer = setTimeout(commitScroll, SCROLL_IDLE_MS)
      return
    }

    at_rest.value = true

    const clamped = clampSpread(slot)
    if (clamped === displayed_spread.value) return

    displayed_spread.value = clamped
    onTurn(clamped)
  }

  watch(() => toValue(desired_spread), goTo)

  watch(
    () => toValue(item_size),
    () => {
      virtualizer.value.measure()
      recenter()
    }
  )

  watch(
    () => toValue(spread_count),
    () => {
      const clamped = clampSpread(displayed_spread.value)
      if (clamped !== displayed_spread.value) {
        displayed_spread.value = clamped
        recenter()
      }
    }
  )

  return { virtualizer, displayed_spread, at_rest }
}
