<script setup lang="ts">
import DashboardActionsPanelShell from './shell.vue'
</script>

<template>
  <div class="relative flex w-full max-w-86.25 shrink-0">
    <dashboard-actions-panel-shell
      data-testid="dashboard-actions-panel-skeleton"
      data-station="panel"
      class="bg-surface shimmer bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-skeleton-sheen)"
      body_class="bg-surface"
    >
      <template #header>
        <div
          data-testid="dashboard-actions-panel-skeleton__header-block"
          class="h-11 w-40 bg-skeleton rounded-3 bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-skeleton-sheen)"
        ></div>
      </template>

      <template #body>
        <div
          data-testid="dashboard-actions-panel-skeleton__body-block"
          class="relative h-30 w-full bg-skeleton rounded-4 max-mxl:hidden shimmer"
        ></div>
        <div
          data-testid="dashboard-actions-panel-skeleton__body-block"
          class="relative h-14 w-full bg-skeleton rounded-4 max-mxl:hidden! shimmer"
        ></div>
      </template>
    </dashboard-actions-panel-shell>

    <div
      data-testid="dashboard-actions-panel-skeleton__polaroid"
      data-station="float"
      class="absolute top-1 -left-1 z-10 -rotate-12 select-none bg-surface rounded-2 w-30 p-2 pb-6"
    >
      <div
        data-testid="dashboard-actions-panel-skeleton__photo"
        class="relative bg-skeleton rounded-1 aspect-square shimmer"
      ></div>
    </div>
  </div>
</template>
