<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import MasterySection from './mastery-section.vue'
import NewCardsSection from './new-cards-section.vue'
import TimelineSection from './timeline-section.vue'
import LeechSection from './leech-section.vue'
import { aggregateSession } from './aggregate'
import type { CardReviewResult } from '@/components/study-session/composables/session-core'
import type { SecondaryAction } from '@/components/study-session/composables/study-modal'

const { results, secondary_action } = defineProps<{
  results: CardReviewResult[]
  secondary_action: SecondaryAction
}>()

const emit = defineEmits<{
  (e: 'action', action?: SecondaryAction): void
}>()

const { t } = useI18n()

const summary = computed(() => aggregateSession(results))
const secondary_label = computed(() => t(`session-summary.${secondary_action}-button`))
</script>

<template>
  <div data-testid="session-summary" class="flex flex-col w-full">
    <div
      data-testid="session-summary__body"
      class="flex flex-col gap-6 px-(--session-padding) py-6"
    >
      <p data-testid="session-summary__score" class="text-base text-brown-500 dark:text-grey-400">
        {{ t('session-summary.score-label', { recalled: summary.score, total: summary.total }) }}
      </p>

      <mastery-section v-if="summary.reinforced_count > 0" :summary="summary" />
      <new-cards-section v-if="summary.new_count > 0" :count="summary.new_count" />
      <timeline-section v-if="summary.total > 0" :summary="summary" />
      <leech-section v-if="summary.leeches.length > 0" :leeches="summary.leeches" />
    </div>

    <div
      data-testid="session-summary__actions"
      class="w-full px-(--session-padding) pb-6 flex gap-2 items-center"
    >
      <ui-button
        data-testid="session-summary__close"
        data-theme="blue-500"
        full-width
        size="xl"
        @press="emit('action')"
      >
        {{ t('session-summary.close') }}
      </ui-button>
      <ui-button
        data-testid="session-summary__secondary"
        data-theme="blue-500"
        full-width
        size="xl"
        @press="emit('action', secondary_action)"
      >
        {{ secondary_label }}
      </ui-button>
    </div>
  </div>
</template>
