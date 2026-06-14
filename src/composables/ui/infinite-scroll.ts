import {
  onBeforeUnmount,
  onMounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef
} from 'vue'

export type UseInfiniteScrollOptions = {
  /**
   * Reactive flag controlling whether intersections fire `on_intersect`.
   * Pass `false` while a load is in flight or when there is no next page,
   * so the observer can stay attached without triggering duplicate loads.
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Pixel margin around the root used to expand the observation area.
   * Defaults to '200px' so the next page starts loading slightly before
   * the sentinel scrolls into the visible viewport.
   */
  root_margin?: string
}

export function useInfiniteScroll(
  sentinel_ref: Readonly<ShallowRef<HTMLElement | null>>,
  on_intersect: () => unknown,
  options: UseInfiniteScrollOptions = {}
) {
  const root_margin = options.root_margin ?? '200px'
  let observer: IntersectionObserver | undefined

  function handle_entries(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      if (!toValue(options.enabled ?? true)) continue
      void on_intersect()
    }
  }

  function attach() {
    if (observer || !sentinel_ref.value) return
    observer = new IntersectionObserver(handle_entries, { rootMargin: root_margin })
    observer.observe(sentinel_ref.value)
  }

  function detach() {
    observer?.disconnect()
    observer = undefined
  }

  onMounted(attach)
  onBeforeUnmount(detach)

  // The sentinel may mount lazily (e.g. after v-if becomes truthy). Re-attach
  // whenever the ref points at a new element.
  watch(sentinel_ref, (el) => {
    detach()
    if (el) attach()
  })
}
