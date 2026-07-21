<script setup lang="ts">
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { usePrimedGrade } from '../card/primed-grade-context'

const primed_grade = usePrimedGrade()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'rated', grade: Grade): void
}>()
</script>

<template>
  <div data-testid="rating-buttons__simple" class="grid w-full grid-cols-2 gap-1.5">
    <ui-button
      data-testid="rating-buttons__again"
      data-palette="red"
      size="xl"
      icon-left="dislike"
      full-width
      :active="primed_grade === Rating.Again"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', Rating.Again)"
    >
      {{ t('study.flashcard.rating.fail-button') }}
    </ui-button>

    <ui-button
      data-testid="rating-buttons__good"
      data-palette="blue"
      size="xl"
      icon-left="like"
      full-width
      :active="primed_grade === Rating.Good"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', Rating.Good)"
    >
      {{ t('study.flashcard.rating.pass-button') }}
    </ui-button>
  </div>
</template>
