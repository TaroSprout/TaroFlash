<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import StatTile from './stat-tile.vue'
import { aggregateSession } from './aggregate'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import type { CardReviewResult } from '@/views/study-session/composables/session-engine'

const { results } = defineProps<{
  results: CardReviewResult[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const { thresholdFor } = useDeckResolution()

const summary = computed(() => aggregateSession(results, thresholdFor))
</script>

<template>
  <div data-testid="session-summary" class="h-full w-full flex flex-col gap-6 p-(--dialog-px)">
    <div
      data-testid="session-summary__body"
      class="flex-1 min-h-0 flex flex-col items-center gap-6"
    >
      <section
        data-testid="session-summary__hero"
        class="flex flex-1 flex-col items-center justify-center gap-6"
      >
        <ui-icon
          data-testid="session-summary__icon"
          src="award"
          class="size-30 text-brown-700 dark:text-brown-100"
        />

        <div data-testid="session-summary__intro" class="flex flex-col items-center gap-2">
          <h2
            data-testid="session-summary__title"
            class="text-center text-3xl font-bold text-brown-700 dark:text-brown-100"
          >
            {{ t('session-summary.title') }}
          </h2>

          <i18n-t
            keypath="session-summary.blurb"
            tag="p"
            data-testid="session-summary__score"
            class="text-center text-base text-brown-700 dark:text-brown-100"
          >
            <template #recalled>
              <span
                data-testid="session-summary__score-recalled"
                class="inline-flex min-w-6 items-center justify-center rounded-2 bg-brown-100 dark:bg-stone-700 px-1 text-brown-700 dark:text-brown-100"
                >{{ summary.score }}</span
              >
            </template>
            <template #total>
              <span
                data-testid="session-summary__score-total"
                class="inline-flex min-w-6 items-center justify-center rounded-2 bg-brown-100 dark:bg-stone-700 px-1 text-brown-700 dark:text-brown-100"
                >{{ summary.total }}</span
              >
            </template>
          </i18n-t>
        </div>
      </section>

      <section
        data-testid="session-summary__footer"
        class="w-full max-w-95 mx-auto flex flex-col gap-4"
      >
        <stat-tile :summary="summary" />

        <ui-button
          data-testid="session-summary__close"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          full-width
          size="xl"
          :sfx="{ press: 'slide_up' }"
          @press="emit('close')"
        >
          {{ t('session-summary.close-button') }}
        </ui-button>
      </section>
    </div>
  </div>
</template>
