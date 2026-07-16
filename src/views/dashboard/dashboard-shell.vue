<script setup lang="ts">
defineSlots<{
  left(): unknown
  right(): unknown
}>()
</script>

<template>
  <div
    data-testid="dashboard-shell"
    class="grid grid-cols-[1fr] mxl:grid-cols-[345px_1fr] gap-x-15.5 gap-y-8 mxl:gap-y-0 px-(--page-px) pt-(--page-pt) pb-12 w-full max-w-229 mx-auto mxl:max-w-none mxl:mx-0"
  >
    <div
      data-testid="dashboard-shell__left-column"
      class="flex justify-center xs:justify-start mxl:flex-col gap-6 self-start mxl:sticky mxl:top-(--nav-height)"
    >
      <slot name="left" />
    </div>

    <div data-testid="dashboard-shell__right-column" class="flex flex-col gap-y-13 min-w-0">
      <slot name="right" />
    </div>
  </div>
</template>
