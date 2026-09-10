<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import SimpleRatingButtons from './simple.vue'
import AdvancedRatingButtons from './advanced.vue'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'

const emit = defineEmits<{
  (e: 'started'): void
}>()

const { t } = useI18n()

const { display_side, show_all_ratings, show_rating_buttons, loading, flingActiveCard } =
  useInjectedStudySessionController()
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
      :sfx="{ tap_pre: 'ui.press' }"
      @press="emit('started')"
    >
      {{ t('study.flashcard.start-button') }}
    </ui-button>

    <div
      v-else
      data-testid="rating-buttons__group"
      :class="{ 'invisible pointer-events-none': !show_rating_buttons }"
    >
      <advanced-rating-buttons v-if="show_all_ratings" @rated="flingActiveCard" />

      <simple-rating-buttons v-else @rated="flingActiveCard" />
    </div>
  </div>
</template>
