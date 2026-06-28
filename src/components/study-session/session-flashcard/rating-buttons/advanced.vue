<script setup lang="ts">
import { computed } from 'vue'
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiButtonGroup, { type ButtonGroupOption } from '@/components/ui-kit/button-group.vue'

type AdvancedRatingButtonsProps = {
  primed_grade?: Grade | null
}

const { primed_grade } = defineProps<AdvancedRatingButtonsProps>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'rated', grade: Grade): void
  (e: 'revealed'): void
}>()

const success_options = computed<ButtonGroupOption[]>(() => [
  {
    value: Rating.Hard,
    label: t('study.flashcard.rating.hard-button'),
    icon: 'smiley-worried'
  },
  { value: Rating.Good, label: t('study.flashcard.rating.good-button'), icon: 'smiley-happy' },
  { value: Rating.Easy, label: t('study.flashcard.rating.easy-button'), icon: 'smiley-very-happy' }
])
</script>

<template>
  <div data-testid="rating-buttons__advanced" class="flex w-full flex-col gap-2">
    <ui-button-group
      data-testid="rating-buttons__success-group"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      :options="success_options"
      :active_value="primed_grade ?? undefined"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', $event as Grade)"
    />

    <div data-testid="rating-buttons__action-row" class="grid grid-cols-2 gap-1.5">
      <ui-button
        data-testid="rating-buttons__again"
        data-theme="red-500"
        data-theme-dark="red-600"
        size="xl"
        icon-left="dislike"
        full-width
        :active="primed_grade === Rating.Again"
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="emit('rated', Rating.Again)"
      >
        {{ t('study.flashcard.rating.again-button') }}
      </ui-button>

      <ui-button
        data-testid="rating-buttons__show"
        data-theme="brown-100"
        data-theme-dark="stone-700"
        size="xl"
        icon-left="card-flip"
        full-width
        :sfx="{ tap_pre: 'snappy_button_5' }"
        @press="emit('revealed')"
      >
        {{ t('study.flashcard.rating.flip-button') }}
      </ui-button>
    </div>
  </div>
</template>
