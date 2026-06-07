import { ref } from 'vue'
import { useMatchMedia } from '@/composables/use-media-query'
import { BUTTON_TAP_DURATION, playButtonTap } from '@/utils/animations/button-tap'

type Options = {
  /** Run GSAP scale/rotate tween on the element. When false, just hold `playing` for the same duration so consumers can drive their own CSS via `[data-playing]`. Defaults to true. */
  animate?: boolean
  /** Animate back to neutral after peaking instead of leaving the inline transform applied. Defaults to false. */
  yoyo?: boolean
  /** Seconds to hold at peak between up and down tweens. Yoyo-only. Defaults to 0.1. */
  hold?: number
  /** Flip `playing` back to false after the animation finishes. Defaults to true. Set false to hold the active state (e.g. when a GSAP transform should remain applied until unmount). */
  reset?: boolean
  /** Duration (seconds) handed to GSAP when `animate` is true. Defaults to `BUTTON_TAP_DURATION`. */
  duration?: number
  /** Pointer environments where the intercept is active. Defaults to 'coarse-only' so desktop clicks pass straight through; 'always' forces the tap on every pointer type. */
  activeOn?: 'coarse-only' | 'always'
}

type Hooks = {
  /** Fires synchronously on every tap, before any intercept decision. Runs even when intercept bails (already playing, or fine pointer in coarse-only mode). */
  onTap?: (e: MouseEvent) => void
  /** Fires once the intercept has committed to playing the animation, after stop/preventDefault and before the first tween frame. Skipped when the intercept bails. */
  beforePlay?: (e: MouseEvent) => void
  /** Fires at the peak of the tap animation. For non-yoyo tweens this coincides with `onAfter`. */
  onPeak?: (e: MouseEvent) => void
  /** Fires after the full tap animation finishes (including the yoyo return, if any). */
  onAfter?: (e: MouseEvent) => void
}

/**
 * Intercepts a click, plays the button-tap animation, and fires lifecycle hooks at tap / peak / end.
 * The MouseEvent is preserved end-to-end so downstream handlers still see `isTrusted=true` within the
 * browser's user-activation window.
 */
export function usePlayOnTap(options: Options = {}) {
  const playing = ref(false)
  const animate = options.animate ?? true
  const reset = options.reset ?? true
  const duration = options.duration ?? BUTTON_TAP_DURATION
  const active_on = options.activeOn ?? 'coarse-only'
  const is_coarse = useMatchMedia('coarse')

  /** Run the tap lifecycle for `e`. `onTap` always fires; the rest fire only when the intercept actually plays. */
  async function interceptClick(e: MouseEvent, hooks: Hooks = {}) {
    hooks.onTap?.(e)

    if (playing.value) return
    if (active_on === 'coarse-only' && !is_coarse.value) return

    const target = e.currentTarget as HTMLElement

    e.stopImmediatePropagation()
    e.preventDefault()

    hooks.beforePlay?.(e)

    playing.value = true

    if (animate) {
      const { peak, done } = playButtonTap(target, duration, {
        yoyo: options.yoyo,
        hold: options.hold
      })
      await peak
      hooks.onPeak?.(e)
      await done
    } else {
      await new Promise((resolve) => setTimeout(resolve, duration * 1000))
      hooks.onPeak?.(e)
    }

    hooks.onAfter?.(e)
    target.blur()

    if (reset) playing.value = false
  }

  return { playing, interceptClick }
}
