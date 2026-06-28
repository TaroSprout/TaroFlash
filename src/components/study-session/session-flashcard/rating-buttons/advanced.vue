<script setup lang="ts">
import { computed } from 'vue'
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiButtonGroup, { type ButtonGroupOption } from '@/components/ui-kit/button-group.vue'

const { t } = useI18n()

const emit = defineEmits<{ (e: 'rated', grade: Grade): void }>()

const success_options = computed<ButtonGroupOption[]>(() => [
  {
    value: Rating.Hard,
    label: t('study.flashcard.rating.hard-button'),
    icon: 'smiley-straight-face'
  },
  { value: Rating.Good, label: t('study.flashcard.rating.good-button'), icon: 'smiley-happy' },
  { value: Rating.Easy, label: t('study.flashcard.rating.easy-button'), icon: 'smiley-tongue' }
])
</script>

<template>
  <div data-testid="rating-buttons__advanced" class="grid w-full grid-cols-4 gap-2">
    <ui-button
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
      class="col-span-3"
      :options="success_options"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', $event as Grade)"
    />
  </div>
</template>
