<script setup lang="ts">
import { computed } from 'vue'
import { type Grade, Rating } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiButtonGroup, { type ButtonGroupOption } from '@/components/ui-kit/button-group.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { usePrimedGrade } from '../card/primed-grade-context'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'

const SUCCESS_GRADES: Grade[] = [Rating.Hard, Rating.Good, Rating.Easy]

const primed_grade = usePrimedGrade()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'rated', grade: Grade): void
}>()

const is_mobile = useMatchMedia('w<md')

const { show_button_preview, rating_times } = useInjectedStudySessionController()

/** Replaces every button's icon/word with its projected interval; falls back to icons until times are frozen. */
const preview_on = computed(
  () => show_button_preview.value && !!rating_times.value.bare[Rating.Good]
)

const success_options = computed<ButtonGroupOption[]>(() => {
  if (preview_on.value) {
    return SUCCESS_GRADES.map((grade) => ({ value: grade, label: rating_times.value.bare[grade] }))
  }

  return [
    { value: Rating.Hard, label: t('study.flashcard.rating.hard-button'), icon: 'smiley-unhappy' },
    { value: Rating.Good, label: t('study.flashcard.rating.good-button'), icon: 'smiley-happy' },
    {
      value: Rating.Easy,
      label: t('study.flashcard.rating.easy-button'),
      icon: 'smiley-very-happy'
    }
  ]
})
</script>

<template>
  <div data-testid="rating-buttons__advanced" class="flex w-full items-center gap-1.5">
    <ui-button
      data-testid="rating-buttons__again"
      data-palette="red"
      size="xl"
      :icon-left="preview_on ? undefined : 'dislike'"
      class="shrink-0"
      :active="primed_grade === Rating.Again"
      :sfx="{ tap_pre: 'ui.press' }"
      @press="emit('rated', Rating.Again)"
    >
      {{ preview_on ? rating_times.bare[Rating.Again] : t('study.flashcard.rating.fail-button') }}
    </ui-button>

    <ui-button-group
      data-testid="rating-buttons__success-group"
      class="flex-1"
      neutral
      :options="success_options"
      :icon_only="is_mobile && !preview_on"
      :active_value="primed_grade ?? undefined"
      :sfx="{ tap_pre: 'ui.press' }"
      @press="emit('rated', $event as Grade)"
    />
  </div>
</template>
