<script setup lang="ts">
import Card from '@/components/card/index.vue'
import StudyCard from './study-card.vue'
import StudyCardEdit from './study-card-edit.vue'
import { computed, onUnmounted, useTemplateRef } from 'vue'
import type { gsap } from 'gsap'
import { type Grade } from 'ts-fsrs'
import { coverCardBeforeEnter, coverCardEnter } from '@/utils/animations/session-intro'
import { useDeckResolution } from '../../deck-resolution'
import { useCoverCarousel } from '@/views/study-session/composables/cover-carousel'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'
import { usePrimedGrade } from './primed-grade-context'

defineExpose({ rate })

const {
  loading,
  editing,
  active_card,
  active_card_preview,
  display_side,
  next_card,
  next_card_side,
  preview_style,
  show_all_ratings,
  startSession,
  flipCurrentCard,
  onCardReviewed,
  onDragProgress,
  onNextCardFlipped,
  onEditUpdate
} = useInjectedStudySessionController()

const resolution = useDeckResolution()
const primed_grade = usePrimedGrade()
const study_card_ref = useTemplateRef('study-card')

const { current_cover } = useCoverCarousel(
  () => resolution.covers.value,
  () => display_side.value === 'cover',
  () => study_card_ref.value?.el()
)

const preview_appearance = computed(() => resolution.appearanceFor(next_card.value?.deck_id))

// While loading nothing renders in the stage — the cover card rises in (via the
// transition) once data lands. No separate skeleton: it's just the cover card.
const card_view = computed<'loading' | 'edit' | 'read'>(() => {
  if (loading.value) return 'loading'
  if (editing.value) return 'edit'
  return 'read'
})

/** Triggers the fling animation on the active card; its review follows. */
function rate(grade: Grade) {
  study_card_ref.value?.rate(grade)
}

function onDragRating(grade: Grade | null) {
  primed_grade.value = grade
}

// Only the cover card rises in (the modal-open intro). Subsequent cards mount
// on their starting side, so their enter is a no-op; the before-enter runs
// before Vue paints the element, which is what keeps the rise flash-free.
let cover_tween: gsap.core.Tween | undefined

function onCardBeforeEnter(el: Element) {
  if (display_side.value === 'cover') coverCardBeforeEnter(el as HTMLElement)
}

function onCardEnter(el: Element, done: () => void) {
  if (display_side.value !== 'cover') return done()
  cover_tween = coverCardEnter(el as HTMLElement, done)
}

// A leave fires when a card is replaced mid-rise; a modal close instead tears
// the subtree down with no leave hook — so kill the rise tween on unmount too,
// or a spam close leaves it running (stray slide_up + work on a detached node).
function onCardLeave(_el: Element, done: () => void) {
  cover_tween?.kill()
  done()
}

onUnmounted(() => cover_tween?.kill())
</script>

<template>
  <div data-testid="study-card__container" class="relative flex items-center justify-center">
    <div
      v-if="!loading && next_card"
      data-testid="study-card__preview"
      class="absolute pointer-events-none"
      :style="preview_style"
    >
      <card
        :key="next_card.id"
        class="w-(--card-w-full)"
        :side="next_card_side"
        v-bind="next_card"
        :cover_config="preview_appearance.cover_config"
        :card_attributes="preview_appearance.card_attributes"
        @flip-complete="onNextCardFlipped"
      />
    </div>

    <transition
      :css="false"
      appear
      @before-enter="onCardBeforeEnter"
      @before-appear="onCardBeforeEnter"
      @enter="onCardEnter"
      @appear="onCardEnter"
      @leave="onCardLeave"
    >
      <study-card
        v-if="card_view === 'read'"
        ref="study-card"
        :key="active_card?.id"
        :card="active_card"
        :side="display_side"
        :options="active_card_preview"
        :show_all_ratings="show_all_ratings"
        :cover_override="current_cover"
        @started="startSession"
        @side-changed="flipCurrentCard"
        @reviewed="onCardReviewed"
        @drag-progress="onDragProgress"
        @drag-rating="onDragRating"
      />
    </transition>
    <study-card-edit
      v-if="card_view === 'edit' && active_card"
      :card="active_card"
      :side="display_side === 'back' ? 'back' : 'front'"
      @update="onEditUpdate"
    />
  </div>
</template>
