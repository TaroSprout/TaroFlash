import { onScopeDispose, ref } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useMotionStore } from '@/stores/motion'
import { BUTTON_TAP_DURATION, playButtonSweep, playButtonTap } from '@/utils/animations/button-tap'
import { emitSfx } from '@/sfx/bus'
import type { MotionHandle } from '@/utils/motion/types'
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
  const motion = useMotionStore()

  // The event handler runs outside a Vue scope, so the driver can't auto-cancel
  // its handle on unmount — track the live one and settle it here instead, or a
  // control torn down mid-tap latches `playing` and can't be reused.
  let active_handle: MotionHandle | null = null
  onScopeDispose(() => active_handle?.cancel())

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

      const target = e.currentTarget as HTMLElement
      const quiet_tier = motion.prefers_reduced_motion || motion.tier === 'minimal'

      if (animate === 'pop' && !quiet_tier) {
        const handle = playButtonTap(target, { yoyo, hold, duration })
        active_handle = handle

        await handle.mark('peak')
        if (phase === 'peak') {
          playTapAudio(tapOpts)
          action?.(e)
        }

        await handle.done
        if (phase === 'done') action?.(e)
      } else {
        const handle = playButtonSweep(target, duration)
        active_handle = handle

        await handle.done
        if (phase !== 'press') {
          playTapAudio(tapOpts)
          action?.(e)
        }
      }

      active_handle = null
      playing.value = false
    }
  }

  return { playing, tap }
}
