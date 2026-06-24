<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import mobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import MasterySection from './mastery-section.vue'
import NewCardsSection from './new-cards-section.vue'
import TimelineSection from './timeline-section.vue'
import LeechSection from './leech-section.vue'
import { aggregateSession } from './aggregate'
import type { CardReviewResult } from '@/components/study-session/composables/session-core'
import type { SecondaryAction } from '@/components/study-session/composables/study-modal'

const { results, secondary_action, theme, close } = defineProps<{
  results: CardReviewResult[]
  secondary_action: SecondaryAction
  theme?: Theme
  close: (action?: SecondaryAction) => void
}>()

const { t } = useI18n()

const summary = computed(() => aggregateSession(results))
const secondary_label = computed(() => t(`session-summary.${secondary_action}-button`))
</script>

<template>
  <mobile-sheet :data-theme="theme ?? 'purple-500'" class="sm:max-w-130!" @close="close()">
    <template #header-content>
      <h1 data-testid="session-summary__heading" class="text-5xl text-white">
        {{ t('session-summary.heading') }}
      </h1>
    </template>

    <div data-testid="session-summary__body" class="flex flex-col gap-6 p-6">
      <p data-testid="session-summary__score" class="text-base text-brown-500 dark:text-grey-400">
        {{ t('session-summary.score-label', { recalled: summary.score, total: summary.total }) }}
      </p>

      <mastery-section v-if="summary.reinforced_count > 0" :summary="summary" />
      <new-cards-section v-if="summary.new_count > 0" :count="summary.new_count" />
      <timeline-section v-if="summary.total > 0" :summary="summary" />
      <leech-section v-if="summary.leeches.length > 0" :leeches="summary.leeches" />
    </div>

    <template #footer>
      <div class="w-full p-4 flex gap-2 items-center">
        <ui-button
          data-testid="session-summary__close"
          data-theme="blue-500"
          full-width
          size="xl"
          @press="close()"
        >
          {{ t('session-summary.close') }}
        </ui-button>
        <ui-button
          data-testid="session-summary__secondary"
          data-theme="blue-500"
          full-width
          size="xl"
          @press="close(secondary_action)"
        >
          {{ secondary_label }}
        </ui-button>
      </div>
    </template>
  </mobile-sheet>
</template>
