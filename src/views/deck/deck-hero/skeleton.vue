<script setup lang="ts">
import Card from '@/components/card/index.vue'

const DEFAULT_COVER: DeckCover = {
  theme: 'brown-300',
  theme_dark: 'stone-900',
  pattern: 'diagonal-stripes'
}
</script>

<template>
  <div
    data-testid="deck-hero-skeleton"
    class="flex max-w-full flex-col items-center gap-6 md:flex-row md:items-end xl:w-max xl:flex-col xl:items-start animate-pulse"
  >
    <card size="lg" side="cover" shimmer :cover_config="DEFAULT_COVER" />

    <div
      data-testid="deck-hero-skeleton__details"
      class="flex flex-col items-center gap-2 md:items-start"
    >
      <div class="h-4 w-64 rounded bg-brown-200 dark:bg-grey-800"></div>
      <div class="h-4 w-32 rounded bg-brown-200 dark:bg-grey-800"></div>
      <div class="h-4 w-24 rounded bg-brown-200 dark:bg-grey-800"></div>
    </div>

    <div data-testid="deck-hero-skeleton__actions" class="flex w-full flex-col gap-2">
      <div class="h-[50px] w-full rounded-xl bg-brown-200 dark:bg-grey-800"></div>
      <div class="h-[50px] w-full rounded-xl bg-brown-200 dark:bg-grey-800"></div>
    </div>
  </div>
</template>
