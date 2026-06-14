<script setup lang="ts">
import SettingsSaveButton from './settings-save-button.vue'
</script>

<template>
  <aside
    data-testid="settings-aside"
    class="h-full flex flex-col justify-end gap-5 text-brown-700 dark:text-brown-100"
  >
    <settings-save-button />
  </aside>
</template>
