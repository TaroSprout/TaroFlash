<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import type { SummaryData } from './aggregate'

const { leeches } = defineProps<{ leeches: SummaryData['leeches'] }>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="session-summary__leech"
    class="flex flex-col gap-3 rounded-4 bg-(--theme-accent)/15 p-4 ring-1 ring-(--theme-accent)/40"
  >
    <div class="flex items-center gap-2">
      <ui-icon src="bell" class="h-5 w-5 text-(--theme-accent)" />
      <h3 class="text-lg text-brown-700 dark:text-brown-300">
        {{ t('session-summary.leech.heading') }}
      </h3>
    </div>

    <ul data-testid="session-summary__leech-list" class="flex flex-col gap-2">
      <li
        v-for="card in leeches"
        :key="card.card_id"
        data-testid="session-summary__leech-card"
        class="flex items-center gap-3 rounded-3 bg-brown-100 dark:bg-grey-800 px-3 py-2.5"
      >
        <span class="flex-1 truncate text-base text-brown-700 dark:text-brown-300">
          {{ card.front_text }}
        </span>
        <span class="rounded-2 bg-(--theme-accent) px-2 py-0.5 text-base text-(--theme-on-accent)">
          {{ t('session-summary.leech.lapses', { count: card.lapses }) }}
        </span>
      </li>
    </ul>

    <p class="text-base text-brown-500 dark:text-grey-400">
      {{ t('session-summary.leech.caption') }}
    </p>
  </div>
</template>
