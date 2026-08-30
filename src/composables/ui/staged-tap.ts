import { ref } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { BUTTON_TAP_DURATION, playButtonTap } from '@/utils/animations/button-tap'
import { emitSfx } from '@/sfx/bus'
import type { SfxRole } from '@/sfx/roles'

export type StagedTapAnimate = 'pop' | 'quiet'
export type StagedTapPhase = 'press' | 'peak' | 'done'

export interface StagedTapOptions {
  /** 'quiet' = bgx sweep only (default). 'pop' = scale/rotate tween. */
  animate?: StagedTapAnimate
  /** Phase at which action fires on coarse. Default: 'peak'. */
  triggerAt?: StagedTapPhase
  /** 'coarse-only' (default) skips animation on a fine pointer. 'always' plays it on every pointer type. */
  activeOn?: 'coarse-only' | 'always'
  /** Pop-only: yoyo the tween back to neutral. Default: false. */
  yoyo?: boolean
  /** Pop-only: seconds to hold at peak before yoyo. Default: 0.1. */
  hold?: number
  /** Animation duration in seconds. Default: BUTTON_TAP_DURATION. */
  duration?: number
}

export interface TapCallOptions {
  /** Coarse only — fires at press, before the animation starts (an "arm" cue). */
  preAudio?: SfxRole
  /** Primary click-feedback sound; fires immediately on fine, at the action phase on coarse. */
  audio?: SfxRole
  /** Fires on every call, even one that bails as already-playing. */
  onTap?: (e: MouseEvent) => void
  /** Override the composable-level triggerAt for this specific call. */
  triggerAt?: StagedTapPhase
}

/**
 * Staged touch-tap handler. On coarse pointers, defers the action to the
 * configured phase so a bgx sweep or pop animation plays first. On fine
 * pointers, the action fires immediately with no animation.
 *
 * Sound phases:
 * - preAudio  — coarse only, fires at press before animation (arm/haptic cue)
 * - audio     — all pointers; fires immediately on fine, at the action phase on coarse
 */
function playTapAudio(tapOpts: TapCallOptions) {
  if (tapOpts.audio) emitSfx(tapOpts.audio)
}

export function useStagedTap(options: StagedTapOptions = {}) {
  const {
    animate = 'quiet',
    triggerAt = 'peak',
    activeOn = 'coarse-only',
    yoyo = false,
    hold = 0.1,
    duration = BUTTON_TAP_DURATION
  } = options

  const playing = ref(false)
  const is_coarse = useMatchMedia('coarse')

  /**
   * Returns an async click handler. On fine pointers the main audio and the
   * action fire immediately. On coarse, plays the animation and fires the
   * action at the configured phase.
   */
  function tap(action?: (e: MouseEvent) => void, tapOpts: TapCallOptions = {}) {
    return async (e: MouseEvent) => {
      tapOpts.onTap?.(e)

      if (activeOn === 'coarse-only' && !is_coarse.value) {
        playTapAudio(tapOpts)
        action?.(e)
        return
      }
      if (playing.value) return

      const phase = tapOpts.triggerAt ?? triggerAt

      if (tapOpts.preAudio) emitSfx(tapOpts.preAudio)
      if (phase === 'press') {
        playTapAudio(tapOpts)
        action?.(e)
      }

      playing.value = true

      if (animate === 'pop') {
        const target = e.currentTarget as HTMLElement
        const { peak, done } = playButtonTap(target, duration, { yoyo, hold })
        await peak
        if (phase === 'peak') {
          playTapAudio(tapOpts)
          action?.(e)
        }
        await done
        if (phase === 'done') action?.(e)
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, duration * 1000))
        if (phase !== 'press') {
          playTapAudio(tapOpts)
          action?.(e)
        }
      }

      playing.value = false
    }
  }

  return { playing, tap }
}
