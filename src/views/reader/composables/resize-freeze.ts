import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref, ShallowRef } from 'vue'
import {
  freezeMotionSafe,
  primeFreeze,
  scaleFreeze,
  settleFreeze
} from '@/utils/animations/reader-freeze'

const SETTLE_MS = 300

export type ResizeFreezeOptions = {
  viewport: Readonly<ShallowRef<HTMLElement | null>>
  surface: Readonly<ShallowRef<HTMLElement | null>>
}

export type ResizeFreeze = {
  viewport_width: Ref<number>
  viewport_height: Ref<number>
  frozen: Ref<boolean>
}

export function useResizeFreeze(options: ResizeFreezeOptions): ResizeFreeze {
  const { viewport, surface } = options

  const viewport_width = ref(0)
  const viewport_height = ref(0)
  const frozen = ref(false)

  let settle_timer: ReturnType<typeof setTimeout> | undefined
  let observer: ResizeObserver | undefined

  onMounted(() => {
    observer = new ResizeObserver(onResize)
    if (viewport.value) observer.observe(viewport.value)
  })

  onBeforeUnmount(() => {
    clearTimeout(settle_timer)
    observer?.disconnect()
  })

  function onResize() {
    const el = viewport.value
    if (!el) return

    const w = el.clientWidth
    const h = el.clientHeight

    if (viewport_width.value === 0) return commit(w, h)
    if (w === viewport_width.value && h === viewport_height.value) return

    if (!frozen.value) beginFreeze()
    scaleFrame(w, h)

    clearTimeout(settle_timer)
    settle_timer = setTimeout(() => settle(w, h), SETTLE_MS)
  }

  function beginFreeze() {
    frozen.value = true

    const el_surface = surface.value
    if (el_surface && freezeMotionSafe()) primeFreeze(el_surface, viewport_width.value)
  }

  function scaleFrame(w: number, h: number) {
    if (!freezeMotionSafe()) return

    const el_surface = surface.value
    if (el_surface) scaleFreeze(el_surface, w / viewport_width.value, h / viewport_height.value)
  }

  async function settle(w: number, h: number) {
    commit(w, h)

    await nextTick()
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const el_surface = surface.value
    if (el_surface && freezeMotionSafe()) await settleFreeze(el_surface)

    frozen.value = false
  }

  function commit(w: number, h: number) {
    viewport_width.value = w
    viewport_height.value = h
  }

  return { viewport_width, viewport_height, frozen }
}
