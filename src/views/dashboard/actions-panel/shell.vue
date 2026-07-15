<script setup lang="ts">
type DashboardActionsPanelShellProps = {
  body_class?: string
}

const { body_class = '' } = defineProps<DashboardActionsPanelShellProps>()

defineSlots<{
  polaroid(): unknown
  header(): unknown
  body(): unknown
}>()
</script>

<template>
  <div class="rounded-8 relative flex flex-col w-full max-w-100">
    <slot name="polaroid" />

    <div data-testid="dashboard-actions-panel-shell__header" class="p-6 pl-34">
      <slot name="header" />
    </div>

    <div
      data-testid="dashboard-actions-panel-shell__body"
      class="cloud-top-[40px] rounded-b-8 flex flex-col gap-6 px-4 pt-14 pb-6"
      :class="body_class"
    >
      <slot name="body" />
    </div>
  </div>
</template>
