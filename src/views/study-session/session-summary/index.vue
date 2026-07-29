<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import StatsPanel from './stats-panel.vue'
import { aggregateSession, type SummaryCategory } from './aggregate'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import type { CardReviewResult } from '@/views/study-session/composables/session-engine'

const { results } = defineProps<{
  results: CardReviewResult[]
}>()

const emit = defineEmits<{
  (e: 'open-category', category: SummaryCategory): void
}>()

const { t } = useI18n()
const { thresholdFor } = useDeckResolution()

const summary = computed(() => aggregateSession(results, thresholdFor))
</script>

<template>
  <dialog-card-body data-testid="session-summary" class="h-full w-full">
    <div
      data-testid="session-summary__content"
      class="flex flex-1 flex-col items-center justify-center gap-6"
    >
      <section data-testid="session-summary__hero" class="flex flex-col items-center gap-4">
        <ui-icon data-testid="session-summary__icon" src="award" class="size-20 text-ink" />

        <h2 data-testid="session-summary__title" class="text-center text-3xl font-bold text-ink">
          {{ t('session-summary.title') }}
        </h2>
      </section>

      <stats-panel
        class="w-full max-w-95 mx-auto"
        :summary="summary"
        @select="emit('open-category', $event)"
      />
    </div>
  </dialog-card-body>
</template>
