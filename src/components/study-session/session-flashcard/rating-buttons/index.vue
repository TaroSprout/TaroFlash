<script setup lang="ts">
import { type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import SimpleRatingButtons from './simple.vue'
import AdvancedRatingButtons from './advanced.vue'

type RatingButtonsProps = {
  options?: RecordLog
  side: CardSide
  show_all_ratings?: boolean
  loading?: boolean
}

const { side, show_all_ratings = false, loading = false } = defineProps<RatingButtonsProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'rated', grade: import('ts-fsrs').Grade): void
}>()
</script>

<template>
  <div data-testid="rating-buttons" class="w-full">
    <ui-button
      v-if="side === 'cover'"
      data-testid="rating-buttons__start"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="xl"
      full-width
      :loading="loading"
      :disabled="loading"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('started')"
    >
      {{ t('study.flashcard.start-button') }}
    </ui-button>

    <advanced-rating-buttons v-else-if="show_all_ratings" @rated="emit('rated', $event)" />

    <simple-rating-buttons v-else @rated="emit('rated', $event)" />
  </div>
</template>
