<script setup lang="ts">
import DeckHeroSkeleton from './deck-hero/skeleton.vue'
</script>

<template>
  <section
    data-testid="deck-skeleton"
    class="flex h-full flex-col xl:flex-row items-center xl:items-start gap-6 md:gap-15 pb-24"
  >
    <deck-hero-skeleton class="relative z-30 xl:sticky xl:top-(--nav-height)" />

    <div class="relative flex h-full w-full flex-col items-center gap-4 animate-pulse">
      <div
        data-testid="deck-skeleton__tabs"
        class="h-10 w-full max-w-208 bg-brown-300 dark:bg-grey-700 rounded-lg"
      ></div>

      <div
        data-testid="deck-skeleton__cards"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-208"
      >
        <div
          v-for="n in 8"
          :key="n"
          class="aspect-[5/7] bg-brown-200 dark:bg-grey-800 rounded-xl"
        ></div>
      </div>
    </div>
  </section>
</template>
