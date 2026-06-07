import { onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'

// Measures two widths so the dropdown can mirror the button:
//  - `min_width`: the widest option row (drives the button's min-width so it is
//    never narrower than its own menu items).
//  - `trigger_width`: the button's actual rendered width (drives the menu width
//    so the menu always matches the button).
// `deps` is a reactive getter watched only to re-measure when options change —
// its value is never read.
export function useDropdownSizing(deps: () => unknown) {
  const triggerRef = ref<ComponentPublicInstance | null>(null)
  const sizerRef = ref<HTMLElement | null>(null)
  const min_width = ref(0)
  const trigger_width = ref(0)

  let observer: ResizeObserver | null = null

  function trigger_el() {
    return (triggerRef.value?.$el ?? null) as HTMLElement | null
  }

  function measure() {
    const sizer = sizerRef.value
    if (sizer) min_width.value = Math.ceil(sizer.getBoundingClientRect().width)

    const el = trigger_el()
    if (el) trigger_width.value = Math.ceil(el.getBoundingClientRect().width)
  }

  onMounted(() => {
    observer = new ResizeObserver(measure)
    const sizer = sizerRef.value
    const el = trigger_el()

    if (sizer) observer.observe(sizer)
    if (el) observer.observe(el)

    measure()
    document.fonts?.ready.then(measure)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  watch(deps, measure, { flush: 'post' })

  return { triggerRef, sizerRef, min_width, trigger_width }
}
