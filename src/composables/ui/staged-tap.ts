import { ref } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { BUTTON_TAP_DURATION, playButtonTap } from '@/utils/animations/button-tap'
import { emitSfx } from '@/sfx/bus'
import type { PlayOptions } from '@/sfx/player'
import type { SoundKey } from '@/sfx/config'

type SfxKey = SoundKey

export type StagedTapAnimate = 'pop' | 'quiet'
export type StagedTapPhase = 'press' | 'peak' | 'done'

export interface StagedTapOptions {
  /** 'quiet' = bgx sweep only (default). 'pop' = scale/rotate tween. */
  animate?: StagedTapAnimate
  /** Phase at which action fires on coarse. Default: 'peak'. */
  triggerAt?: StagedTapPhase
  /**
   * 'coarse-only' (default): animation only plays on touch; fine pointer fires
   * action immediately and skips animation. 'always': animation plays on every
   * pointer type — for decorative pops not tied to real click events.
   */
  activeOn?: 'coarse-only' | 'always'
  /** Pop-only: yoyo the tween back to neutral. Default: false. */
  yoyo?: boolean
  /** Pop-only: seconds to hold at peak before yoyo. Default: 0.1. */
  hold?: number
  /** Animation duration in seconds. Default: BUTTON_TAP_DURATION. */
  duration?: number
}

export interface TapCallOptions {
  /**
   * Coarse only — fires at press, before the animation starts. Use for an
   * "arm" cue that has no fine-pointer equivalent (e.g. a haptic-style tick).
   */
  preAudio?: SfxKey
  /**
   * All pointers — the primary click-feedback sound.
   * Fine pointer: fires immediately, before the action.
   * Coarse pointer: fires at the action phase (peak by default).
   */
  audio?: SfxKey
  /** Options forwarded to emitSfx for the main audio key (blocking, debounce). */
  audioOpts?: PlayOptions
  /** Coarse only — fires after the animation completes. */
  postAudio?: SfxKey
  /**
   * Fires on every call before any coarse/fine check — even when the tap will
   * bail (already playing). Use for side-effects that must happen on every touch
   * regardless of animation state (e.g. burst FX).
   */
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
 * - postAudio — coarse only, fires after animation completes
 *
 * @example
 * const { playing, tap } = useStagedTap({ animate: 'pop', yoyo: true })
 * const handler = tap((e) => doThing(e), { audio: 'snappy_button_5' })
 * // <button @click="handler" :data-playing="playing || null">
 */
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
        if (tapOpts.audio) emitSfx(tapOpts.audio, tapOpts.audioOpts)
        action?.(e)
        return
      }
      if (playing.value) return

      const phase = tapOpts.triggerAt ?? triggerAt

      if (tapOpts.preAudio) emitSfx(tapOpts.preAudio)
      if (phase === 'press') {
        if (tapOpts.audio) emitSfx(tapOpts.audio, tapOpts.audioOpts)
        action?.(e)
      }

      playing.value = true

      if (animate === 'pop') {
        const target = e.currentTarget as HTMLElement
        const { peak, done } = playButtonTap(target, duration, { yoyo, hold })
        await peak
        if (phase === 'peak') {
          if (tapOpts.audio) emitSfx(tapOpts.audio, tapOpts.audioOpts)
          action?.(e)
        }
        await done
        if (tapOpts.postAudio) emitSfx(tapOpts.postAudio)
        if (phase === 'done') action?.(e)
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, duration * 1000))
        if (phase !== 'press') {
          if (tapOpts.audio) emitSfx(tapOpts.audio, tapOpts.audioOpts)
          action?.(e)
        }
        if (tapOpts.postAudio) emitSfx(tapOpts.postAudio)
      }

      playing.value = false
    }
  }

  return { playing, tap }
}
