<script setup lang="ts">
import { provideDepth } from '@/composables/ui/depth'

type DashboardActionsPanelShellProps = {
  body_class?: string
}

const { body_class = '' } = defineProps<DashboardActionsPanelShellProps>()

// The body is a raised surface (its own bg), so it declares depth 1 — a
// recessed element inside it (the options-panel well) then resolves relative to
// this surface rather than falling through to the depth-0 page.
provideDepth(1)

defineSlots<{
  polaroid(): unknown
  header(): unknown
  body(): unknown
}>()
</script>

<template>
  <div class="rounded-8 relative flex flex-col w-full max-w-86.25 shrink-0">
    <slot name="polaroid" />

    <div data-testid="dashboard-actions-panel-shell__header" class="p-6 pl-34">
      <slot name="header" />
    </div>

    <div
      data-testid="dashboard-actions-panel-shell__body"
      data-depth="1"
      class="cloud-top-[40px] rounded-b-8 flex flex-col gap-6 px-4 pt-14 pb-6 h-full max-mxl:justify-end"
      :class="body_class"
    >
      <slot name="body" />
    </div>
  </div>
</template>
