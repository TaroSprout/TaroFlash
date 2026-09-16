<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiPaperclips from '@/components/ui-kit/paperclips.vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import StatsPanel from './stats-panel.vue'
import { aggregateSession, type SummaryCategory } from './aggregate'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import { useCapabilities } from '@/api/capabilities'
import type { CardReviewResult } from '@/views/study-session/composables/session-engine'
import type { SessionEarnings } from '@/api/rewards'

const { results, earnings } = defineProps<{
  results: CardReviewResult[]
  earnings: SessionEarnings | null
}>()

const emit = defineEmits<{
  (e: 'open-category', category: SummaryCategory): void
}>()

const { t } = useI18n()
const { thresholdFor } = useDeckResolution()
const { isLive } = useCapabilities()

const summary = computed(() => aggregateSession(results, thresholdFor))

const show_earnings = computed(() => isLive('session_rewards', false) && !!earnings)
</script>

<template>
  <dialog-card-body data-testid="session-summary" class="h-full w-full">
    <div
      data-testid="session-summary__content"
      class="flex flex-1 flex-col items-center justify-center gap-6"
    >
      <section data-testid="session-summary__hero" class="flex flex-col items-center gap-4">
        <ui-icon data-testid="session-summary__icon" src="award" class="size-20 text-ink" />
      </section>

      <section
        v-if="show_earnings && earnings"
        data-testid="session-summary__earnings"
        class="grid grid-cols-[auto_auto] items-center gap-x-6 gap-y-2"
      >
        <span
          data-testid="session-summary__earnings-heading"
          class="text-lg font-semibold text-ink"
        >
          {{ t('session-summary.earnings.heading') }}
        </span>
        <ui-paperclips class="justify-self-end text-2xl font-bold" :amount="earnings.base" />

        <span data-testid="session-summary__earnings-bonus" class="text-base text-ink-muted">
          {{ t('session-summary.earnings.bonus-label') }}
        </span>
        <ui-paperclips class="justify-self-end text-2xl font-bold" :amount="earnings.bonus" />

        <span data-testid="session-summary__earnings-balance" class="text-base text-ink-muted">
          {{ t('session-summary.earnings.balance-label') }}
        </span>
        <ui-paperclips class="justify-self-end text-2xl font-bold" :amount="earnings.balance" />
      </section>

      <stats-panel
        class="w-full max-w-95 mx-auto"
        :summary="summary"
        @select="emit('open-category', $event)"
      />
    </div>
  </dialog-card-body>
</template>
