<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import StatsPanel from './stats-panel.vue'
import { aggregateSession, type SummaryCategory } from './aggregate'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import type { CardReviewResult } from '@/views/study-session/composables/session-engine'

const { results } = defineProps<{
  results: CardReviewResult[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-category', category: SummaryCategory): void
}>()

const { t } = useI18n()
const { thresholdFor } = useDeckResolution()

const summary = computed(() => aggregateSession(results, thresholdFor))
</script>

<template>
  <div data-testid="session-summary" class="h-full w-full flex flex-col gap-6 pb-6">
    <div
      data-testid="session-summary__body"
      class="flex-1 min-h-0 overflow-y-auto scroll-hidden flex flex-col items-center gap-6"
    >
      <section data-testid="session-summary__hero" class="flex flex-col items-center gap-4">
        <ui-icon data-testid="session-summary__icon" src="award" class="size-20 text-ink" />

        <div data-testid="session-summary__intro" class="flex flex-col items-center gap-2">
          <h2 data-testid="session-summary__title" class="text-center text-3xl font-bold text-ink">
            {{ t('session-summary.title') }}
          </h2>

          <i18n-t
            keypath="session-summary.blurb"
            tag="p"
            data-testid="session-summary__score"
            class="text-center text-base text-ink"
          >
            <template #recalled>
              <span
                data-testid="session-summary__score-recalled"
                class="inline-flex min-w-6 items-center justify-center rounded-2 bg-element px-1 text-ink"
                >{{ summary.groups.correct.length }}</span
              >
            </template>
            <template #total>
              <span
                data-testid="session-summary__score-total"
                class="inline-flex min-w-6 items-center justify-center rounded-2 bg-element px-1 text-ink"
                >{{ summary.total }}</span
              >
            </template>
          </i18n-t>
        </div>
      </section>

      <stats-panel
        class="w-full max-w-95 mx-auto"
        :summary="summary"
        @select="emit('open-category', $event)"
      />
    </div>

    <section data-testid="session-summary__footer" class="w-full max-w-95 mx-auto">
      <ui-button
        neutral
        data-testid="session-summary__close"
        full-width
        size="xl"
        :sfx="{ press: 'slide_up' }"
        @press="emit('close')"
      >
        {{ t('session-summary.close-button') }}
      </ui-button>
    </section>
  </div>
</template>
