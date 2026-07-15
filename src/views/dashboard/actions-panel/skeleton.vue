<script setup lang="ts">
import DashboardActionsPanelShell from './shell.vue'
</script>

<template>
  <dashboard-actions-panel-shell
    data-testid="dashboard-actions-panel-skeleton"
    class="bg-brown-200 dark:bg-stone-900 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40"
    body_class="bg-brown-300 dark:bg-stone-900"
  >
    <template #polaroid>
      <div
        data-testid="dashboard-actions-panel-skeleton__polaroid"
        class="absolute top-1 -left-1 z-10 -rotate-12 select-none bg-brown-50 dark:bg-stone-700 rounded-2 w-30 p-2 pb-6"
      >
        <div class="bg-brown-200 dark:bg-stone-900 rounded-1 aspect-square"></div>
      </div>
    </template>

    <template #header>
      <div class="h-11 w-40 bg-brown-300 dark:bg-grey-600 rounded-3"></div>
    </template>

    <template #body>
      <div class="h-30 w-full bg-brown-200 dark:bg-stone-700 rounded-4 max-mxl:hidden"></div>
      <div class="h-14 w-full bg-brown-200 dark:bg-grey-800 rounded-4 max-mxl:hidden!"></div>
    </template>
  </dashboard-actions-panel-shell>
</template>
