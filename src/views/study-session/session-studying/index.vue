<script setup lang="ts">
import CardStage from './card/card-stage.vue'
</script>

<template>
  <div data-testid="session-flashcard" class="relative h-full w-full pt-9">
    <div data-testid="study-session__main" class="flex h-full w-full items-center justify-center">
      <card-stage class="w-full max-w-117" />
    </div>
  </div>
</template>
