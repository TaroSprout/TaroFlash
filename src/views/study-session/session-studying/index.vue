<script setup lang="ts">
import CardStage from './card/card-stage.vue'
import { type Grade } from 'ts-fsrs'
import { useTemplateRef } from 'vue'

defineExpose({ rate })

const stage = useTemplateRef('stage')

/** Delegates to the card stage's own fling animation; rating buttons live in the session footer. */
function rate(grade: Grade) {
  stage.value?.rate(grade)
}
</script>

<template>
  <div data-testid="session-flashcard" class="relative h-full w-full">
    <div data-testid="study-session__main" class="flex h-full w-full items-center justify-center">
      <card-stage ref="stage" class="w-full max-w-117" />
    </div>
  </div>
</template>
