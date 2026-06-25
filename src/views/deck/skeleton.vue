<script setup lang="ts">
import DeckHeroSkeleton from './deck-hero/skeleton.vue'
import ModeToolbarSkeleton from './mode-toolbar/skeleton.vue'
import CardGridSkeleton from './card-grid/skeleton.vue'
import { onMounted, onUnmounted } from 'vue'

onMounted(() => (document.documentElement.style.overflow = 'hidden'))
onUnmounted(() => (document.documentElement.style.overflow = ''))
</script>

<template>
  <section
    data-testid="deck-skeleton"
    class="flex h-full flex-col xl:flex-row items-center xl:items-start gap-6 md:gap-15 pb-24"
  >
    <deck-hero-skeleton class="relative z-30 xl:sticky xl:top-(--nav-height)" />

    <div class="relative w-full pb-4">
      <mode-toolbar-skeleton class="max-md:hidden" />
      <card-grid-skeleton class="md:mt-6" />
    </div>
  </section>
</template>
