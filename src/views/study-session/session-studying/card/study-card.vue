<script setup lang="ts">
import Card from '@/components/card/index.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { computed, onMounted, ref } from 'vue'
import { type Grade, Rating, type RecordLog } from 'ts-fsrs'
import { emitStudySfx } from '@/sfx/bus'
import { useGestures } from '@/composables/ui/gestures'
import { useShortcuts } from '@/composables/shortcuts'
import { useRatingFormat } from '@/composables/fsrs'
import { useI18n } from 'vue-i18n'
import { useDeckResolution } from '../../deck-resolution'

const DRAG_RATING_CONFIG = {
  [Rating.Hard]: { icon: 'smiley-unhappy', label_key: 'study.flashcard.rating.hard-button' },
  [Rating.Good]: { icon: 'smiley-happy', label_key: 'study.flashcard.rating.good-button' },
  [Rating.Easy]: { icon: 'smiley-very-happy', label_key: 'study.flashcard.rating.easy-button' }
} as const

const ALL_GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

defineExpose({ rate, el: () => card_ref.value?.$el as HTMLElement | undefined })

type StudyCardProps = {
  card?: Card
  side: CardSide
  options?: RecordLog
  show_all_ratings?: boolean
  cover_override?: DeckCover
}

const { card, side, options, show_all_ratings, cover_override } = defineProps<StudyCardProps>()

const resolution = useDeckResolution()

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'side-changed'): void
  (e: 'reviewed', grade: Grade | undefined): void
  (e: 'drag-progress', progress: number, duration: number): void
  (e: 'drag-rating', grade: Grade | null): void
}>()

const { getRatingTimeFormat } = useRatingFormat()
const { t } = useI18n()

const FLIP_THRESHOLD = 10
const SWIPE_DISTANCE_THRESHOLD = 50
const VERTICAL_RATING_THRESHOLD = 50
const FLING_SPEED = 0.25
const SNAP_BACK_SPEED = 0.15
const FULL_REVEAL_DISTANCE = 150

const card_ref = ref<InstanceType<typeof Card> | null>(null)
const card_offset = ref<number>(0)
const drag_rating = ref<Grade>(Rating.Good)
const primed_grade = ref<Grade | null>(null)

const is_dragging = ref(false)
// Guards against rapid key/click spam re-triggering an action (and replaying
// its sfx) mid-animation. For a flip it covers only the outgoing face's
// rotate-out (cleared on `flip-out-complete`) so the card is re-flippable the
// instant the new face shows; for a fling it stays true until this card
// unmounts on advance.
const is_animating = ref(false)

const { register } = useGestures()
const shortcuts = useShortcuts('study-card')

const appearance = computed(() => resolution.appearanceFor(card?.deck_id))

const passVisible = computed(() => card_offset.value > SWIPE_DISTANCE_THRESHOLD)
const failVisible = computed(() => card_offset.value < -SWIPE_DISTANCE_THRESHOLD)
const drag_rating_config = computed(
  () => DRAG_RATING_CONFIG[drag_rating.value as keyof typeof DRAG_RATING_CONFIG]
)

/**
 * Formatted once per card, not per render. `getRatingTimeFormat` diffs the
 * FSRS due-date against `Date.now()`, so calling it directly from the
 * template re-evaluates (and drifts, eventually going negative) on every
 * unrelated re-render — drag updates, the sitting-idle ticks, etc. Keying
 * this off `options` alone means it recomputes once when a new card's
 * preview arrives and stays frozen for that card's whole life.
 */
const rating_time_labels = computed<Record<Grade, string>>(() => {
  const labels = {} as Record<Grade, string>
  for (const grade of ALL_GRADES) labels[grade] = getRatingTimeFormat(grade, options)
  return labels
})

onMounted(() => {
  const el = card_ref.value?.$el as HTMLElement | null
  if (!el) return

  register(el, {
    onStart: () => {
      el.style.transition = 'none'
    },
    onMove: ({ dx, dy }) => handleDrag(el, dx, dy),
    onEnd: (result) => endDrag(el, result),
    onCancel: () => snapBack(el)
  })
  el.addEventListener('mousedown', onCardMouseDown)

  shortcuts.register({ combo: 'arrowright', handler: () => swipe(el, 1) })
  shortcuts.register({ combo: 'arrowleft', handler: () => swipe(el, -1) })
  shortcuts.register({ combo: 'space', handler: () => triggerCardFlip() })
})

/** Triggers the fling animation for a given grade. Called by the parent via template ref. */
function rate(grade: Grade) {
  if (side === 'cover' || is_animating.value) return

  const el = card_ref.value?.$el as HTMLElement | null
  if (!el) return
  flingCard(el, grade === Rating.Again ? -1 : 1, grade)
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
function flingCard(
  el: HTMLElement,
  direction: number,
  grade: Grade = direction > 0 ? Rating.Good : Rating.Again
) {
  if (side === 'cover') return

  if (primed_grade.value !== null) {
    primed_grade.value = null
    emit('drag-rating', null)
  }

  is_animating.value = true
  const targetX = direction * (window.innerWidth + el.getBoundingClientRect().width)

  el.style.transition = `transform ${FLING_SPEED}s ease-out`
  el.style.transform = `translateX(${targetX}px) rotate(${direction * 45}deg)`
  emit('drag-progress', 1, FLING_SPEED)

  emitStudySfx(grade === Rating.Again ? 'music_plink_locancel' : 'music_plink_ok')

  // Leave is_animating true: after `reviewed` the parent plays the incoming
  // card's intro flip before advancing. This instance stays mounted (and so
  // its shortcuts stay live) through that window, so the flag keeps spam from
  // re-flinging until the next card is keyed in fresh.
  const onTransitionEnd = () => {
    el.removeEventListener('transitionend', onTransitionEnd)
    card_offset.value = 0
    emit('reviewed', grade)
  }

  el.addEventListener('transitionend', onTransitionEnd)
}

/** Tracks the card position and tilt while the user is dragging. */
function handleDrag(el: HTMLElement, dx: number, dy: number) {
  if (side === 'cover') return

  if (toSwipeZone(card_offset.value) !== toSwipeZone(dx)) emitStudySfx('music_plink_mid')

  is_dragging.value = Math.abs(dx) > FLIP_THRESHOLD
  card_offset.value = dx
  el.style.transform = `translateX(${dx}px) rotate(${dx / 10}deg)`
  emit('drag-progress', Math.min(Math.abs(dx) / FULL_REVEAL_DISTANCE, 1), 0)

  updateDragRating(dx, dy)
}

/** Updates drag_rating from vertical position and emits primed_grade when the zone or rating changes. */
function updateDragRating(dx: number, dy: number) {
  if (show_all_ratings && dx > SWIPE_DISTANCE_THRESHOLD) {
    const new_rating = toDragRating(dy)
    if (new_rating !== drag_rating.value) {
      emitStudySfx('music_plink_mid')
      drag_rating.value = new_rating
    }
  } else {
    drag_rating.value = Rating.Good
  }

  const new_primed =
    dx > SWIPE_DISTANCE_THRESHOLD
      ? drag_rating.value
      : dx < -SWIPE_DISTANCE_THRESHOLD
        ? Rating.Again
        : null
  if (new_primed !== primed_grade.value) {
    primed_grade.value = new_primed
    emit('drag-rating', new_primed)
  }
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
    // A tap that ends a drag-selection of the card's text shouldn't also flip.
    // A plain tap collapses the selection on mousedown, so this only catches
    // the release of a real selection.
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return

    triggerCardFlip()
    return
  }

  if (side === 'cover') return

  if (Math.abs(dx) > SWIPE_DISTANCE_THRESHOLD)
    flingCard(el, Math.sign(dx), Math.sign(dx) > 0 ? drag_rating.value : undefined)
  else snapBack(el)
}

/** A gesture that barely moved in either axis — a tap, not a drag. */
function isTap(dx: number, dy: number) {
  return Math.abs(dx) < FLIP_THRESHOLD && Math.abs(dy) < FLIP_THRESHOLD
}

// Spamming the flip racks up the browser's click counter, whose double/triple
// clicks word- and line-select the card content. Suppress the default selection
// on those multi-clicks only — a single click (and a deliberate click-drag to
// select) keeps `detail === 1`, so manual selection still works.
function onCardMouseDown(e: MouseEvent) {
  if (e.detail > 1) e.preventDefault()
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
  drag_rating.value = Rating.Good
  if (primed_grade.value !== null) {
    primed_grade.value = null
    emit('drag-rating', null)
  }
  emit('drag-progress', 0, SNAP_BACK_SPEED)

  el.addEventListener(
    'transitionend',
    () => {
      is_dragging.value = false
    },
    { once: true }
  )
}

/** Maps vertical drag offset to a rating when past the right threshold. */
function toDragRating(dy: number): Grade {
  if (dy < -VERTICAL_RATING_THRESHOLD) return Rating.Easy
  if (dy > VERTICAL_RATING_THRESHOLD) return Rating.Hard
  return Rating.Good
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
      :class="is_dragging ? 'cursor-grabbing' : 'cursor-grab'"
      size="xl"
      v-bind="card"
      :side="side"
      :cover_config="cover_override ?? appearance.cover_config"
      :card_attributes="appearance.card_attributes"
      @flip-out-complete="is_animating = false"
    >
      <div class="absolute inset-0 overflow-hidden rounded-(--face-radius)">
        <div
          data-testid="review-label--fail"
          class="review-label review-label--fail"
          :class="{ 'review-label--visible': failVisible }"
        >
          <ui-icon src="dislike" class="size-14" />
          {{ $t('study.flashcard.rating.fail-feedback') }}
          <p class="text-sm">{{ rating_time_labels[Rating.Again] }}</p>
        </div>
        <div
          data-testid="review-label--pass"
          class="review-label review-label--pass"
          :class="{ 'review-label--visible': passVisible }"
        >
          <template v-if="show_all_ratings">
            <ui-icon :src="drag_rating_config.icon" class="size-14" />
            {{ t(drag_rating_config.label_key) }}
            <p class="text-sm">{{ rating_time_labels[drag_rating] }}</p>
          </template>
          <template v-else>
            <ui-icon src="like" class="size-14" />
            {{ $t('study.flashcard.rating.pass-feedback') }}
            <p class="text-sm">{{ rating_time_labels[Rating.Good] }}</p>
          </template>
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

  font-size: var(--text-3xl);
  line-height: var(--text-3xl--line-height);

  background: var(--color-white);
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

[data-theme='dark'] .review-label {
  background: var(--color-stone-700);
}

.review-label--fail {
  color: var(--color-red-500);
}

.review-label--pass {
  color: var(--color-blue-500);
}

.review-label--visible {
  transform: scale(100%);
  opacity: 1;
}

/* Cover-card entrance. The static `opacity: 0` hides the card the instant the
   class is in the markup — it does NOT depend on the animation's backwards-fill
   being sampled on the first frame (which a freshly-inserted element skips,
   painting its resting state once → the flash). The animation then RESTORES
   opacity (it outranks the static value while running/filling) and slides it up
   after the delay; the JS animationend handler drops the class once done. */
.cover-card-rise {
  opacity: 0;
  animation: cover-card-rise 0.1s 0.15s ease-out both;
}

@keyframes cover-card-rise {
  from {
    opacity: 0;
    transform: translateY(60px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
