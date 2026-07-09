<script setup lang="ts">
import SessionProgress from './session-progress.vue'
import CardStage from './card-stage.vue'
import StudyEditFooter from './study-edit-footer.vue'
import RatingButtons from './rating-buttons/index.vue'
import { useInjectedStudySessionController } from '@/components/flashcard-session/composables/session-controller'
import { type Grade } from 'ts-fsrs'
import { ref, useTemplateRef } from 'vue'
import { providePrimedGrade } from './primed-grade-context'

const {
  mode,
  cards,
  current_card_side,
  current_index,
  active_card,
  active_card_preview,
  is_starting_side,
  show_all_ratings,
  next_card,
  next_card_side,
  preview_style,
  is_cover,
  loading,
  editing,
  saving,
  startSession,
  flipCurrentCard,
  onDragProgress,
  onNextCardFlipped,
  onEditUpdate,
  stopEdit,
  onCardReviewed
} = useInjectedStudySessionController()

const stage = useTemplateRef('stage')
const primed_grade = ref<Grade | null>(null)
providePrimedGrade(primed_grade)

/** Triggers the fling animation on the card stage; reviewed event follows. */
function onRated(grade: Grade) {
  stage.value?.rate(grade)
}
</script>

<template>
  <div data-testid="session-flashcard" class="relative h-full w-full">
    <div
      data-testid="study-session__main"
      class="h-full flex flex-col items-center gap-8 p-(--dialog-px)"
      :class="{ 'opacity-0 pointer-events-none': mode !== 'studying' }"
    >
      <div
        data-testid="study-session__body"
        class="flex-1 min-h-0 w-full max-w-117 flex flex-col items-center justify-between"
      >
        <session-progress
          :editing="editing"
          :saving="saving"
          :is_cover="is_cover"
          :reviewed="current_index"
          :total="cards.length"
        />

        <card-stage
          ref="stage"
          :loading="loading"
          :editing="editing"
          :active_card="active_card"
          :active_card_preview="active_card_preview"
          :current_card_side="current_card_side"
          :show_all_ratings="show_all_ratings"
          :next_card="next_card"
          :next_card_side="next_card_side"
          :preview_style="preview_style"
          @started="startSession"
          @side-changed="flipCurrentCard"
          @reviewed="onCardReviewed"
          @drag-progress="onDragProgress"
          @drag-rating="(grade) => (primed_grade = grade)"
          @next-flipped="onNextCardFlipped"
          @edit-update="onEditUpdate"
        />

        <rating-buttons
          v-if="!editing"
          class="z-10 w-full"
          :options="active_card_preview"
          :side="current_card_side"
          :show_all_ratings="show_all_ratings"
          :loading="loading"
          @started="startSession"
          @rated="onRated"
        />

        <study-edit-footer
          v-else
          :is_starting_side="is_starting_side"
          @flip="flipCurrentCard"
          @done="stopEdit"
        />
      </div>
    </div>
  </div>
</template>
