<script setup lang="ts">
import Card from '@/components/card/index.vue'

const DEFAULT_COVER: DeckCover = {
  pattern: 'diagonal-stripes'
}
</script>

<template>
  <div
    data-testid="deck-hero-skeleton"
    class="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-end xl:w-max xl:flex-col xl:items-start animate-pulse"
  >
    <card class="w-(--card-w-md)" side="cover" shimmer :cover_config="DEFAULT_COVER" />

    <div
      data-testid="deck-hero-skeleton__details"
      class="flex flex-col items-center gap-2 md:items-start"
    >
      <div class="h-4 w-64 rounded-2 bg-panel"></div>
      <div class="h-4 w-52 rounded-2 bg-panel"></div>
      <div class="h-4 w-24 rounded-2 bg-panel"></div>
    </div>
  </div>
</template>
