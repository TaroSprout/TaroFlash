<script setup lang="ts">
import DashboardActionsPanelShell from './shell.vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'
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
          class="bg-skeleton rounded-3 bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-skeleton-sheen) h-11 w-40"
        ></div>
      </template>

      <template #body>
        <div
          data-testid="dashboard-actions-panel-skeleton__body-block"
          class="bg-skeleton rounded-4 shimmer max-mxl:hidden relative h-30 w-full"
        ></div>
        <div
          data-testid="dashboard-actions-panel-skeleton__body-block"
          class="bg-skeleton rounded-4 shimmer max-mxl:hidden! relative h-14 w-full"
        ></div>
      </template>
    </dashboard-actions-panel-shell>

    <member-polaroid
      data-testid="dashboard-actions-panel-skeleton__polaroid"
      class="absolute top-1 -left-1 z-10"
    >
      <template #photo>
        <div
          data-testid="dashboard-actions-panel-skeleton__photo"
          class="bg-skeleton shimmer relative h-full w-full"
        ></div>
      </template>
    </member-polaroid>
  </div>
</template>
