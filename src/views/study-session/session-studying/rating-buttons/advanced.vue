<script setup lang="ts">
import { computed } from 'vue'
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiButtonGroup, { type ButtonGroupOption } from '@/components/ui-kit/button-group.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { usePrimedGrade } from '../card/primed-grade-context'

const primed_grade = usePrimedGrade()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'rated', grade: Grade): void
}>()

const is_mobile = useMatchMedia('w<md')

const success_options = computed<ButtonGroupOption[]>(() => [
  {
    value: Rating.Hard,
    label: t('study.flashcard.rating.hard-button'),
    icon: 'smiley-unhappy'
  },
  { value: Rating.Good, label: t('study.flashcard.rating.good-button'), icon: 'smiley-happy' },
  { value: Rating.Easy, label: t('study.flashcard.rating.easy-button'), icon: 'smiley-very-happy' }
])
</script>

<template>
  <div data-testid="rating-buttons__advanced" class="flex w-full items-center gap-1.5">
    <ui-button
      data-testid="rating-buttons__again"
      data-palette="red"
      size="xl"
      icon-left="dislike"
      class="shrink-0"
      :active="primed_grade === Rating.Again"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', Rating.Again)"
    >
      {{ t('study.flashcard.rating.again-button') }}
    </ui-button>

    <ui-button-group
      data-testid="rating-buttons__success-group"
      class="flex-1"
      neutral
      :options="success_options"
      :icon_only="is_mobile"
      :active_value="primed_grade ?? undefined"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', $event as Grade)"
    />
  </div>
</template>
