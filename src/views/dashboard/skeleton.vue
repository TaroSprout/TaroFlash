<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardShell from './dashboard-shell.vue'
import DashboardSection from './dashboard-section.vue'
import DashboardActionsPanelSkeleton from './actions-panel/skeleton.vue'
import DashboardTipCardSkeleton from './tip-card/skeleton.vue'
import ReviewInboxSkeleton from './review-inbox/skeleton.vue'
import DeckGridSkeleton from './deck-grid/skeleton.vue'

const { t } = useI18n()

onMounted(() => (document.documentElement.style.overflow = 'hidden'))
onUnmounted(() => (document.documentElement.style.overflow = ''))
</script>

<template>
  <div data-testid="dashboard-skeleton" class="w-full">
    <dashboard-shell>
      <template #left>
        <dashboard-actions-panel-skeleton />
        <dashboard-tip-card-skeleton />
      </template>

      <template #right>
        <dashboard-section loading :label="t('dashboard.deck-filter.due-label')">
          <review-inbox-skeleton />
        </dashboard-section>

        <dashboard-section loading :label="t('dashboard.deck-filter.all-label')">
          <template #subheader>
            <div data-testid="deck-grid-sort-options-skeleton" class="flex gap-8">
              <div v-for="n in 3" :key="n" class="h-6 w-20 bg-panel rounded-2 animate-pulse"></div>
            </div>
          </template>

          <deck-grid-skeleton />
        </dashboard-section>
      </template>
    </dashboard-shell>
  </div>
</template>
