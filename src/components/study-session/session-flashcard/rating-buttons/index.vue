<script setup lang="ts">
import { type Grade, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import SimpleRatingButtons from './simple.vue'
import AdvancedRatingButtons from './advanced.vue'

type RatingButtonsProps = {
  options?: RecordLog
  side: CardSide
  show_all_ratings?: boolean
  primed_grade?: Grade | null
}

const { side, show_all_ratings = false, primed_grade } = defineProps<RatingButtonsProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'revealed'): void
  (e: 'started'): void
  (e: 'rated', grade: Grade): void
}>()
</script>

<template>
  <div data-testid="rating-buttons" class="w-full">
    <advanced-rating-buttons
      v-if="show_all_ratings && side !== 'cover'"
      :side="side"
      :primed_grade="primed_grade"
      @rated="emit('rated', $event)"
      @revealed="emit('revealed')"
    />

    <simple-rating-buttons
      v-else-if="side === 'back'"
      :primed_grade="primed_grade"
      @rated="emit('rated', $event)"
    />

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
