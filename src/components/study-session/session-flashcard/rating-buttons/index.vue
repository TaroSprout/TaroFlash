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
    <!-- Cover: start button centred in a container sized to match the 2-row layout
         (2 × 50px xl buttons + 8px gap-2 = 108px) so there's no height jump. -->
    <div
      v-if="side === 'cover'"
      data-testid="rating-buttons__start-container"
      class="flex h-[108px] w-full items-center"
    >
      <ui-button
        data-testid="rating-buttons__start"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="xl"
        full-width
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="emit('started')"
      >
        {{ t('study.flashcard.start-button') }}
      </ui-button>
    </div>

    <advanced-rating-buttons
      v-else-if="show_all_ratings"
      :primed_grade="primed_grade"
      @rated="emit('rated', $event)"
      @revealed="emit('revealed')"
    />

    <simple-rating-buttons
      v-else
      :primed_grade="primed_grade"
      @rated="emit('rated', $event)"
      @revealed="emit('revealed')"
    />
  </div>
</template>
