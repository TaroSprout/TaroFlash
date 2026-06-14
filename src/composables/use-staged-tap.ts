import { ref } from 'vue'
import { useMatchMedia } from '@/composables/use-media-query'
import { BUTTON_TAP_DURATION, playButtonTap } from '@/utils/animations/button-tap'
import { emitSfx } from '@/sfx/bus'
import type { NamespacedAudioKey } from '@/sfx/config'

type SfxKey = NamespacedAudioKey

export type StagedTapAnimate = 'pop' | 'quiet'
export type StagedTapPhase = 'press' | 'peak' | 'done'

export interface StagedTapOptions {
  /** 'quiet' = bgx sweep only (default). 'pop' = scale/rotate tween. */
  animate?: StagedTapAnimate
  /** Phase at which action fires on coarse. Fine always fires at press. Default: 'peak'. */
  triggerAt?: StagedTapPhase
  /** Pop-only: yoyo the tween back to neutral. Default: false. */
  yoyo?: boolean
  /** Pop-only: seconds to hold at peak before yoyo. Default: 0.1. */
  hold?: number
  /** Animation duration in seconds. Default: BUTTON_TAP_DURATION. */
  duration?: number
}

export interface TapCallOptions {
  /** Plays immediately on coarse press, before animation. */
  pressAudio?: SfxKey
  /**
   * Set true when tap() is called from a @click.capture handler that coexists
   * with a natural @click (e.g. via v-bind="$attrs"). On fine pointers tap()
   * becomes a no-op so the natural @click fires the action exactly once.
   * On coarse, tap() still intercepts and stops propagation as normal.
   */
  captureMode?: boolean
}

/**
 * Staged touch-tap handler. On coarse pointers, defers the action to the
 * configured phase so a bgx sweep or pop animation plays first. On fine
 * pointers, the action fires immediately with no animation.
 *
 * @example
 * const { playing, tap } = useStagedTap({ animate: 'pop', yoyo: true })
 * const handler = tap((e) => doThing(e), { pressAudio: 'ui.snappy_button_5' })
 * // <button @click="handler" :data-playing="playing || null">
 */
export function useStagedTap(options: StagedTapOptions = {}) {
  const {
    animate = 'quiet',
    triggerAt = 'peak',
    yoyo = false,
    hold = 0.1,
    duration = BUTTON_TAP_DURATION
  } = options

  const playing = ref(false)
  const is_coarse = useMatchMedia('coarse')

  /**
   * Returns an async click handler. On fine pointers the action fires at once.
   * On coarse, it plays the tap animation and fires the action at the configured phase.
   */
  function tap(action?: (e: MouseEvent) => void, tapOpts: TapCallOptions = {}) {
    return async (e: MouseEvent) => {
      if (!is_coarse.value) {
        if (!tapOpts.captureMode) action?.(e)
        return
      }
      if (playing.value) return

      // Prevent the natural @click (e.g. from v-bind="$attrs") from firing the
      // action a second time after our deferred call at peak.
      if (tapOpts.captureMode) e.stopImmediatePropagation()

      if (tapOpts.pressAudio) emitSfx(tapOpts.pressAudio)
      if (triggerAt === 'press') action?.(e)

      playing.value = true

      if (animate === 'pop') {
        const target = e.currentTarget as HTMLElement
        const { peak, done } = playButtonTap(target, duration, { yoyo, hold })
        await peak
        if (triggerAt === 'peak') action?.(e)
        await done
        if (triggerAt === 'done') action?.(e)
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, duration * 1000))
        if (triggerAt !== 'press') action?.(e)
      }

      playing.value = false
    }
  }

  return { playing, tap }
}
