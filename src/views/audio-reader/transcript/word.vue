<script setup lang="ts">
const { display, index } = defineProps<{
  display: string
  index: number
}>()
</script>

<template>
  <span data-testid="transcript-word" :data-word-index="index" class="cursor-pointer">{{
    display
  }}</span>
</template>
