import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/composables/ui/media-query')

import { useMotionStore } from '@/stores/motion'
import { useMatchMedia } from '@/composables/ui/media-query'
import { MOTION_TIER_FACTORS } from '@/utils/motion/tier'

function setHardware({ device_memory, cores }) {
  Object.defineProperty(navigator, 'deviceMemory', {
    value: device_memory,
    configurable: true
  })
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    value: cores,
    configurable: true
  })
}

describe('motion store', () => {
  let reduced_motion
  let coarse_pointer

  beforeEach(() => {
    setActivePinia(createPinia())
    document.documentElement.removeAttribute('data-motion')

    reduced_motion = ref(false)
    coarse_pointer = ref(false)
    vi.mocked(useMatchMedia).mockImplementation((query) =>
      query === 'reduced-motion' ? reduced_motion : coarse_pointer
    )

    setHardware({ device_memory: 8, cores: 8 })
  })

  test('load sets data-motion on documentElement to the computed tier', () => {
    const store = useMotionStore()
    store.load()
    expect(document.documentElement.getAttribute('data-motion')).toBe(store.tier)
  })

  test('tier is computed once from the hardware signals available at store creation', () => {
    setHardware({ device_memory: 2, cores: 2 })
    const store = useMotionStore()

    expect(store.tier).toBe('minimal')
    expect(store.factors).toEqual(MOTION_TIER_FACTORS.minimal)

    setHardware({ device_memory: 8, cores: 8 })
    expect(store.tier).toBe('minimal')
  })

  test('reduced-motion toggling never alters the computed tier', async () => {
    setHardware({ device_memory: 8, cores: 8 })
    const store = useMotionStore()
    const tier_before = store.tier

    reduced_motion.value = true

    expect(store.prefers_reduced_motion).toBe(true)
    expect(store.tier).toBe(tier_before)
  })

  test('coarse-pointer toggling never alters the computed tier', async () => {
    setHardware({ device_memory: 2, cores: 2 })
    const store = useMotionStore()
    const tier_before = store.tier

    coarse_pointer.value = true

    expect(store.has_coarse_pointer).toBe(true)
    expect(store.tier).toBe(tier_before)
  })

  test('prefers_reduced_motion and has_coarse_pointer track their own matchMedia refs', () => {
    const store = useMotionStore()

    expect(store.prefers_reduced_motion).toBe(false)
    expect(store.has_coarse_pointer).toBe(false)

    reduced_motion.value = true
    coarse_pointer.value = true

    expect(store.prefers_reduced_motion).toBe(true)
    expect(store.has_coarse_pointer).toBe(true)
  })
})
