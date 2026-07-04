<script setup lang="ts">
import ModeView from './mode-view.vue'
</script>

<template>
  <div data-testid="mode-toolbar-container" class="w-full z-10 relative">
    <mode-view />
    <div class="bg-brown-100 dark:bg-grey-900 p-2 rounded-5 absolute -inset-2 -z-1"></div>
  </div>
</template>
