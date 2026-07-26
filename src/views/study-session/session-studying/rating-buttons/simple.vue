<script setup lang="ts">
import { computed } from 'vue'
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { usePrimedGrade } from '../card/primed-grade-context'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'

const primed_grade = usePrimedGrade()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'rated', grade: Grade): void
}>()

const { show_button_preview, rating_times } = useInjectedStudySessionController()

const preview_on = computed(
  () => show_button_preview.value && !!rating_times.value.bare[Rating.Good]
)
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
      {{ preview_on ? rating_times.bare[Rating.Again] : t('study.flashcard.rating.fail-button') }}
    </ui-button>

    <ui-button
      data-testid="rating-buttons__good"
      neutral
      size="xl"
      icon-left="like"
      full-width
      :active="primed_grade === Rating.Good"
      :sfx="{ tap_pre: 'snappy_button_5' }"
      @press="emit('rated', Rating.Good)"
    >
      {{ preview_on ? rating_times.bare[Rating.Good] : t('study.flashcard.rating.pass-button') }}
    </ui-button>
  </div>
</template>
