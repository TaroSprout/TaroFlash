import { computed, onBeforeUnmount, ref } from 'vue'
import { TIPS } from '@/utils/tips/catalog'

const ROTATE_INTERVAL_MS = 15000

export function useTipRotation() {
  const index = ref(Math.floor(Math.random() * TIPS.length))

  const timer =
    TIPS.length > 1
      ? setInterval(() => {
          index.value = (index.value + 1) % TIPS.length
        }, ROTATE_INTERVAL_MS)
      : undefined

  onBeforeUnmount(() => clearInterval(timer))

  const tip = computed(() => TIPS[index.value])

  return { tip }
}
