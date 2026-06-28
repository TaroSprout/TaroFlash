<script setup lang="ts">
import { computed } from 'vue'
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiButtonGroup, { type ButtonGroupOption } from '@/components/ui-kit/button-group.vue'

type AdvancedRatingButtonsProps = {
  side: CardSide
}

const { side } = defineProps<AdvancedRatingButtonsProps>()

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
  <div
    data-testid="rating-buttons__advanced"
    class="flex w-full flex-col-reverse gap-2 sm:grid sm:grid-cols-4"
  >
    <ui-button
      v-if="side === 'front'"
      data-testid="rating-buttons__show"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="xl"
      full-width
      class="sm:col-span-4"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('revealed')"
    >
      {{ t('study.flashcard.rating.flip-button') }}
    </ui-button>
    <ui-button
      v-else
      data-testid="rating-buttons__again"
      data-theme="red-500"
      data-theme-dark="red-600"
      size="xl"
      icon-left="dislike"
      full-width
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', Rating.Again)"
    >
      {{ t('study.flashcard.rating.again-button') }}
    </ui-button>

    <ui-button-group
      data-testid="rating-buttons__success-group"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      :class="side === 'front' ? 'invisible sm:hidden' : 'sm:col-span-3'"
      :options="success_options"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', $event as Grade)"
    />
  </div>
</template>
