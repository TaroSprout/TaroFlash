import { computed, onUnmounted, ref, watch, type ComputedRef } from 'vue'
import type { StudyCard } from './session-engine'
import { emitSfx } from '@/sfx/bus'

/**
 * Preview-card animation state for flashcard mode. Owns the progress/opacity
 * that tracks the user's drag on the active card, and a one-shot promise
 * resolver used to sequence the pre-flip animation on the incoming card.
 */
export function useCardPreview(next_card: ComputedRef<StudyCard | undefined>) {
  const next_card_side = ref<CardSide>('cover')
  const preview_progress = ref(0)
  const preview_transition_duration = ref(0)

  const preview_style = computed(() => ({
    opacity: preview_progress.value,
    transform: `scale(${0.9 + 0.1 * preview_progress.value})`,
    transition: preview_transition_duration.value
      ? `opacity ${preview_transition_duration.value}s ease-out, transform ${preview_transition_duration.value}s ease-out`
      : 'none'
  }))

  watch(
    () => next_card.value?.id,
    () => {
      preview_progress.value = 0
      preview_transition_duration.value = 0
    }
  )

  function onDragProgress(progress: number, duration: number) {
    preview_transition_duration.value = duration
    preview_progress.value = progress
  }

  let resolveFlip: (() => void) | null = null
  onUnmounted(() => resolveFlip?.())

  function onNextCardFlipped() {
    resolveFlip?.()
    resolveFlip = null
  }

  /**
   * Plays the incoming preview card's intro flip to `side` and resolves once it
   * settles. Also fires the `slide_up` cue, since every advance to a next card
   * runs through here.
   */
  function awaitFlip(side: 'front' | 'back') {
    emitSfx('slide_up')
    next_card_side.value = side
    return new Promise<void>((resolve) => {
      resolveFlip = resolve
    }).then(() => {
      next_card_side.value = 'cover'
    })
  }

  return {
    next_card_side,
    preview_style,
    onDragProgress,
    onNextCardFlipped,
    awaitFlip
  }
}
