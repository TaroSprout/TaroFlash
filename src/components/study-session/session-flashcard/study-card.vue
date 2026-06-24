<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { gsap } from 'gsap'
import { type Grade, Rating, type RecordLog } from 'ts-fsrs'
import { emitStudySfx } from '@/sfx/bus'
import { useGestures } from '@/composables/ui/gestures'
import { useShortcuts } from '@/composables/shortcuts'
import { useRatingFormat } from '@/composables/fsrs'
import { revealCoverCard } from '@/utils/animations/session-intro'
import { useDeckContext } from '../deck-context'

defineExpose({ rate })

const { card, side, options } = defineProps<{
  card?: Card
  side: CardSide
  options?: RecordLog
}>()

const deck_context = useDeckContext()

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'side-changed'): void
  (e: 'reviewed', grade: Grade | undefined): void
  (e: 'drag-progress', progress: number, duration: number): void
}>()

const { getRatingTimeFormat } = useRatingFormat()

const FLIP_THRESHOLD = 10
const SWIPE_DISTANCE_THRESHOLD = 50
const FLING_SPEED = 0.25
const SNAP_BACK_SPEED = 0.15
const FULL_REVEAL_DISTANCE = 150

const card_ref = ref<InstanceType<typeof Card> | null>(null)
const card_offset = ref<number>(0)

// The cover card starts hidden in markup so it never flashes before its
// rise-in runs; the reveal tween's inline opacity overrides this class.
const cover_intro = ref(side === 'cover')
let cover_tween: gsap.core.Tween | undefined

const is_dragging = ref(false)
// Guards against rapid key/click spam re-triggering an action (and replaying
// its sfx) mid-animation. For a flip it covers only the outgoing face's
// rotate-out (cleared on `flip-out-complete`) so the card is re-flippable the
// instant the new face shows; for a fling it stays true until this card
// unmounts on advance.
const is_animating = ref(false)

const passVisible = computed(() => card_offset.value > SWIPE_DISTANCE_THRESHOLD)
const failVisible = computed(() => card_offset.value < -SWIPE_DISTANCE_THRESHOLD)

const { register } = useGestures()
const shortcuts = useShortcuts('study-card')

onMounted(() => {
  const el = card_ref.value?.$el as HTMLElement | null
  if (!el) return

  // First card mounts on the cover; rise it in alongside the modal's pop.
  if (side === 'cover') cover_tween = revealCoverCard(el)

  register(el, {
    onStart: () => {
      el.style.transition = 'none'
    },
    onMove: ({ dx }) => handleDrag(el, dx),
    onEnd: (result) => endDrag(el, result),
    onCancel: () => snapBack(el)
  })

  shortcuts.register({ combo: 'arrowright', handler: () => swipe(el, 1) })
  shortcuts.register({ combo: 'arrowleft', handler: () => swipe(el, -1) })
  shortcuts.register({ combo: 'space', handler: () => triggerCardFlip() })
})

// Closing the modal mid-rise must cancel the tween — otherwise its delayed
// onStart fires (a stray sfx) and a stale tween can outlive the element.
onUnmounted(() => cover_tween?.kill())

/** Triggers the fling animation for a given grade. Called by the parent via template ref. */
function rate(grade: Grade) {
  if (side === 'cover' || is_animating.value) return

  const el = card_ref.value?.$el as HTMLElement | null
  if (!el) return
  flingCard(el, grade === Rating.Good ? 1 : -1)
}

/**
 * Flips the card face. No-ops while the outgoing face is still rotating out,
 * so spamming space mid-flip can't replay the flip sfx.
 */
function triggerCardFlip() {
  if (is_animating.value) return

  is_animating.value = true
  if (side === 'cover') emit('started')
  else emit('side-changed')
}

/**
 * Animates the card off-screen in the given direction, then emits `reviewed`.
 * Resets transform state once the CSS transition ends.
 */
function flingCard(el: HTMLElement, direction: number) {
  if (side === 'cover') return

  is_animating.value = true
  const targetX = direction * (window.innerWidth + el.getBoundingClientRect().width)
  const rating = direction > 0 ? Rating.Good : Rating.Again

  el.style.transition = `transform ${FLING_SPEED}s ease-out`
  el.style.transform = `translateX(${targetX}px) rotate(${direction * 45}deg)`
  emit('drag-progress', 1, FLING_SPEED)

  emitStudySfx(rating === Rating.Good ? 'music_plink_ok' : 'music_plink_locancel')

  // Leave is_animating true: after `reviewed` the parent plays the incoming
  // card's intro flip before advancing. This instance stays mounted (and so
  // its shortcuts stay live) through that window, so the flag keeps spam from
  // re-flinging until the next card is keyed in fresh.
  const onTransitionEnd = () => {
    el.removeEventListener('transitionend', onTransitionEnd)
    card_offset.value = 0
    emit('reviewed', rating)
  }

  el.addEventListener('transitionend', onTransitionEnd)
}

/** Tracks the card position and tilt while the user is dragging. */
function handleDrag(el: HTMLElement, dx: number) {
  if (side === 'cover') return

  if (toSwipeZone(card_offset.value) !== toSwipeZone(dx)) emitStudySfx('music_plink_mid')

  is_dragging.value = Math.abs(dx) > FLIP_THRESHOLD // drives the grab cursor, with a bit of wiggle room before it engages
  card_offset.value = dx
  el.style.transform = `translateX(${dx}px) rotate(${dx / 10}deg)`
  emit('drag-progress', Math.min(Math.abs(dx) / FULL_REVEAL_DISTANCE, 1), 0)
}

/**
 * Routes a finished pointer gesture. A tap (barely any movement) flips the
 * card; a long horizontal swipe flings it; anything in between snaps back.
 * Driving the flip from the pointer pipeline — rather than a DOM `mouseup` —
 * avoids relying on synthetic mouse events, which touch browsers suppress once
 * the gesture has called `preventDefault`/`setPointerCapture` (the cause of the
 * mobile "tap twice to flip" bug).
 */
function endDrag(el: HTMLElement, { dx, dy }: { dx: number; dy: number }) {
  if (is_animating.value) return

  if (isTap(dx, dy)) {
    triggerCardFlip()
    return
  }

  if (side === 'cover') return

  if (Math.abs(dx) > SWIPE_DISTANCE_THRESHOLD) flingCard(el, Math.sign(dx))
  else snapBack(el)
}

/** A gesture that barely moved in either axis — a tap, not a drag. */
function isTap(dx: number, dy: number) {
  return Math.abs(dx) < FLIP_THRESHOLD && Math.abs(dy) < FLIP_THRESHOLD
}

/** Flings the card in a direction (keyboard shortcut entry point). */
function swipe(el: HTMLElement, direction: number) {
  if (side === 'cover' || is_animating.value) return
  flingCard(el, direction)
}

/** Animates the card back to its resting position and clears drag state. */
function snapBack(el: HTMLElement) {
  el.style.transition = `transform ${SNAP_BACK_SPEED}s ease-out`
  el.style.transform = ''
  card_offset.value = 0
  emit('drag-progress', 0, SNAP_BACK_SPEED)

  setTimeout(() => {
    is_dragging.value = false
  }, SNAP_BACK_SPEED * 1000)
}

/** Maps a drag offset to a swipe zone: 1 (pass), -1 (fail), 0 (neutral). */
function toSwipeZone(offset: number) {
  return offset > SWIPE_DISTANCE_THRESHOLD ? 1 : offset < -SWIPE_DISTANCE_THRESHOLD ? -1 : 0
}
</script>

<template>
  <div class="relative">
    <card
      ref="card_ref"
      data-testid="study-card"
      class="z-10"
      :class="[is_dragging ? 'cursor-grabbing' : 'cursor-grab', { 'opacity-0': cover_intro }]"
      size="xl"
      v-bind="card"
      :side="side"
      :cover_config="deck_context.cover_config"
      :card_attributes="deck_context.card_attributes"
      @flip-out-complete="is_animating = false"
    >
      <div class="absolute inset-0 overflow-hidden rounded-(--face-radius)">
        <div
          data-testid="review-label--fail"
          class="review-label bg-pink-400"
          :class="{ 'review-label--visible': failVisible }"
        >
          {{ $t('study.flashcard.rating.fail-feedback') }}
          <p class="text-sm">{{ getRatingTimeFormat(Rating.Again, options) }}</p>
        </div>
        <div
          data-testid="review-label--pass"
          class="review-label bg-green-400"
          :class="{ 'review-label--visible': passVisible }"
        >
          {{ $t('study.flashcard.rating.pass-feedback') }}
          <p class="text-sm">{{ getRatingTimeFormat(Rating.Good, options) }}</p>
        </div>
      </div>
    </card>
  </div>
</template>

<style>
.review-label {
  --duration: 0.05s;

  position: absolute;
  inset: -100px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: var(--color-white);
  font-size: var(--text-3xl);
  line-height: var(--text-3xl--line-height);

  border-radius: inherit;
  pointer-events: none;
  opacity: 0;

  user-select: none;
  z-index: 10;
  transform: scale(50%);
  transition:
    transform var(--duration) linear,
    opacity var(--duration) linear;
}

.review-label--visible {
  transform: scale(100%);
  opacity: 1;
}
</style>
