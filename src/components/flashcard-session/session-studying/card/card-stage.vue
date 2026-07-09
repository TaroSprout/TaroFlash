<script setup lang="ts">
import Card from '@/components/card/index.vue'
import StudyCard from './study-card.vue'
import StudyCardEdit from './study-card-edit.vue'
import { computed, onUnmounted, useTemplateRef, type StyleValue } from 'vue'
import type { gsap } from 'gsap'
import { type Grade, type RecordLog } from 'ts-fsrs'
import { coverCardBeforeEnter, coverCardEnter } from '@/utils/animations/session-intro'
import { useDeckContext } from '../../deck-context'
import { useCoverCarousel } from '@/components/flashcard-session/composables/cover-carousel'
import { type StudyCard as StudyCardType } from '@/components/flashcard-session/composables/flashcard-session'

type CardStageProps = {
  loading: boolean
  editing: boolean
  active_card?: StudyCardType
  active_card_preview?: RecordLog
  current_card_side: CardSide
  next_card?: StudyCardType
  next_card_side: CardSide
  preview_style: StyleValue
  show_all_ratings?: boolean
}

const {
  loading,
  editing,
  active_card,
  active_card_preview,
  current_card_side,
  next_card,
  next_card_side,
  show_all_ratings
} = defineProps<CardStageProps>()

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'side-changed'): void
  (e: 'reviewed', grade: Grade | undefined): void
  (e: 'drag-progress', progress: number, duration: number): void
  (e: 'drag-rating', grade: Grade | null): void
  (e: 'next-flipped'): void
  (e: 'edit-update', side: 'front' | 'back', text: string): void
}>()

defineExpose({ rate })

const deck_context = useDeckContext()
const study_card_ref = useTemplateRef('study-card')

const { current_cover } = useCoverCarousel(
  () => deck_context.value.covers,
  () => current_card_side === 'cover',
  () => study_card_ref.value?.el()
)

const preview_appearance = computed(() => deck_context.value.appearanceFor(next_card?.deck_id))

// While loading nothing renders in the stage — the cover card rises in (via the
// transition) once data lands. No separate skeleton: it's just the cover card.
const card_view = computed<'loading' | 'edit' | 'read'>(() => {
  if (loading) return 'loading'
  if (editing) return 'edit'
  return 'read'
})

/** Triggers the fling animation on the active card; its `reviewed` event follows. */
function rate(grade: Grade) {
  study_card_ref.value?.rate(grade)
}

// Only the cover card rises in (the modal-open intro). Subsequent cards mount
// on their starting side, so their enter is a no-op; the before-enter runs
// before Vue paints the element, which is what keeps the rise flash-free.
let cover_tween: gsap.core.Tween | undefined

function onCardBeforeEnter(el: Element) {
  if (current_card_side === 'cover') coverCardBeforeEnter(el as HTMLElement)
}

function onCardEnter(el: Element, done: () => void) {
  if (current_card_side !== 'cover') return done()
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
        size="xl"
        :side="next_card_side"
        v-bind="next_card"
        :cover_config="preview_appearance.cover_config"
        :card_attributes="preview_appearance.card_attributes"
        @flip-complete="emit('next-flipped')"
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
        :side="current_card_side"
        :options="active_card_preview"
        :show_all_ratings="show_all_ratings"
        :cover_override="current_cover"
        @started="emit('started')"
        @side-changed="emit('side-changed')"
        @reviewed="(grade) => emit('reviewed', grade)"
        @drag-progress="(progress, duration) => emit('drag-progress', progress, duration)"
        @drag-rating="(grade) => emit('drag-rating', grade)"
      />
    </transition>
    <study-card-edit
      v-if="card_view === 'edit' && active_card"
      :card="active_card"
      :side="current_card_side === 'back' ? 'back' : 'front'"
      @update="(side, text) => emit('edit-update', side, text)"
    />
  </div>
</template>
