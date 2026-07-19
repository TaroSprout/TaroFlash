<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import SimpleRatingButtons from './simple.vue'
import AdvancedRatingButtons from './advanced.vue'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'rated', grade: import('ts-fsrs').Grade): void
}>()

const { t } = useI18n()

const { display_side, show_all_ratings, loading } = useInjectedStudySessionController()
</script>

<template>
  <div data-testid="rating-buttons" class="w-full">
    <ui-button
      v-if="display_side === 'cover'"
      data-testid="rating-buttons__start"
      data-palette="brand"
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
