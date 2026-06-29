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
}

const { side, show_all_ratings = false } = defineProps<RatingButtonsProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'revealed'): void
  (e: 'started'): void
  (e: 'rated', grade: import('ts-fsrs').Grade): void
}>()

// 2 × 50px (xl button height) + 8px (gap-2) — matches the two-row layout height
// so the cover start button doesn't cause a layout jump when the session begins.
const COVER_HEIGHT = '108px'
</script>

<template>
  <div data-testid="rating-buttons" class="w-full">
    <div
      v-if="side === 'cover'"
      data-testid="rating-buttons__start-container"
      class="flex w-full items-center"
      :style="{ height: COVER_HEIGHT }"
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
      @rated="emit('rated', $event)"
      @revealed="emit('revealed')"
    />

    <simple-rating-buttons v-else @rated="emit('rated', $event)" @revealed="emit('revealed')" />
  </div>
</template>
