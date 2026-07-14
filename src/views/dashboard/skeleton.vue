<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardShell from './dashboard-shell.vue'
import DashboardSection from './dashboard-section.vue'
import DashboardActionsPanelSkeleton from './actions-panel/skeleton.vue'
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
      </template>

      <template #right>
        <dashboard-section :label="t('dashboard.deck-filter.due-label')">
          <review-inbox-skeleton />
        </dashboard-section>

        <dashboard-section :label="t('dashboard.deck-filter.all-label')">
          <deck-grid-skeleton />
        </dashboard-section>
      </template>
    </dashboard-shell>
  </div>
</template>
