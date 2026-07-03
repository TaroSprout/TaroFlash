<script setup lang="ts">
import PageSettingsPanel from '@/views/deck/mode-toolbar/page-settings-panel.vue'
</script>

<template>
  <div
    data-testid="mobile-page-settings"
    class="flex w-full items-center px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <page-settings-panel />
  </div>
</template>
