<script setup lang="ts">
import SessionProgress from './session-progress.vue'
import CardStage from './card/card-stage.vue'
import StudyEditFooter from './study-edit-footer.vue'
import RatingButtons from './rating-buttons/index.vue'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'
import { type Grade } from 'ts-fsrs'
import { ref, useTemplateRef } from 'vue'
import { providePrimedGrade } from './card/primed-grade-context'

const { state, editing, startSession } = useInjectedStudySessionController()

const stage = useTemplateRef('stage')
const primed_grade = ref<Grade | null>(null)
providePrimedGrade(primed_grade)

/** Rating buttons prime a grade; the fling animation runs on the card stage. */
function onRated(grade: Grade) {
  stage.value?.rate(grade)
}
</script>

<template>
  <div data-testid="session-flashcard" class="relative h-full w-full">
    <div
      data-testid="study-session__main"
      class="h-full flex flex-col items-center gap-8 p-(--dialog-px)"
      :class="{ 'opacity-0 pointer-events-none': state === 'summary' }"
    >
      <div
        data-testid="study-session__body"
        class="flex-1 min-h-0 w-full max-w-117 flex flex-col items-center justify-between"
      >
        <session-progress />

        <card-stage ref="stage" />

        <rating-buttons
          v-if="!editing"
          class="z-10 w-full"
          @started="startSession"
          @rated="onRated"
        />

        <study-edit-footer v-else />
      </div>
    </div>
  </div>
</template>
