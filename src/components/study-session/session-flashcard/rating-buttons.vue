<script setup lang="ts">
import { type Grade, Rating, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

const { t } = useI18n()

const { side } = defineProps<{
  options?: RecordLog
  side: CardSide
}>()

const emit = defineEmits<{
  (e: 'revealed'): void
  (e: 'started'): void
  (e: 'rated', grade: Grade): void
}>()

function onRatingClicked(grade: Grade) {
  emit('rated', grade)
}
</script>

<template>
  <div data-testid="rating-buttons" class="w-full">
    <div v-if="side === 'back'" class="grid w-full grid-cols-2 gap-2">
      <ui-button
        data-testid="rating-buttons__again"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        size="xl"
        icon-left="close"
        full-width
        class="max-w-78.5"
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="onRatingClicked(Rating.Again)"
      >
        {{ t('study.flashcard.rating.fail-button') }}
      </ui-button>

      <ui-button
        data-testid="rating-buttons__good"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="xl"
        icon-left="check"
        full-width
        class="max-w-78.5"
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="onRatingClicked(Rating.Good)"
      >
        {{ t('study.flashcard.rating.pass-button') }}
      </ui-button>
    </div>

    <ui-button
      v-else-if="side === 'front'"
      data-testid="rating-buttons__show"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="xl"
      full-width
      class="mx-auto max-w-78.5"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('revealed')"
    >
      {{ t('study.flashcard.rating.flip-button') }}
    </ui-button>

    <ui-button
      v-else
      data-testid="rating-buttons__start"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="xl"
      full-width
      class="mx-auto max-w-78.5"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('started')"
    >
      {{ t('study.flashcard.start-button') }}
    </ui-button>
  </div>
</template>
