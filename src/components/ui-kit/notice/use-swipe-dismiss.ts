import { watch, type Ref } from 'vue'
import { gsap } from 'gsap'
import { useGestures } from '@/composables/ui/gestures'
import { useMatchMedia } from '@/composables/ui/media-query'

export type SwipeDirection = 'up' | 'down'

const DISMISS_DISTANCE = 60
const SNAP_BACK_DURATION = 0.2

export interface UseSwipeDismissOptions {
  directions: SwipeDirection[]
  onDismiss: () => void
}

/**
 * Lets a notice be swiped away vertically in the given directions, on
 * coarse (touch) pointers only. Watches `el_ref` rather than registering
 * once on mount, since a `v-if`-gated panel doesn't exist yet at mount time.
 * Drag position is tracked through GSAP so the element's existing close
 * animation (which reads GSAP's cached transform) continues seamlessly from
 * wherever the swipe left it, instead of snapping back before fading out.
 */
export function useSwipeDismiss(
  el_ref: Ref<HTMLElement | undefined | null>,
  options: UseSwipeDismissOptions
) {
  const { register } = useGestures()
  const is_coarse = useMatchMedia('coarse')

  watch(
    el_ref,
    (el) => {
      if (!el || !is_coarse.value) return

      register(el, {
        onMove: ({ dy }) => gsap.set(el, { y: allowedDelta(dy) }),
        onEnd: ({ dy }) =>
          Math.abs(allowedDelta(dy)) > DISMISS_DISTANCE ? options.onDismiss() : snapBack(el),
        onCancel: () => snapBack(el)
      })
    },
    { immediate: true }
  )

  function allowedDelta(dy: number): number {
    if (dy < 0) return options.directions.includes('up') ? dy : 0
    return options.directions.includes('down') ? dy : 0
  }

  function snapBack(el: HTMLElement) {
    gsap.to(el, { y: 0, duration: SNAP_BACK_DURATION, ease: 'expo.out' })
  }
}
