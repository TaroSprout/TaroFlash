<script setup lang="ts">
import DeckShell from './deck-shell.vue'
import DeckHeroSkeleton from './deck-hero/skeleton.vue'
import ModeToolbarSkeleton from './mode-toolbar/skeleton.vue'
import CardGridSkeleton from './card-grid/skeleton.vue'
import { onMounted, onUnmounted } from 'vue'

onMounted(() => (document.documentElement.style.overflow = 'hidden'))
onUnmounted(() => (document.documentElement.style.overflow = ''))
</script>

<template>
  <section data-testid="deck-skeleton" class="h-full px-(--page-px) pt-(--page-pt) pb-24">
    <deck-shell>
      <template #hero>
        <deck-hero-skeleton class="relative z-30 xl:sticky xl:top-(--nav-height)" />
      </template>

      <template #main>
        <div class="relative w-full pb-4">
          <mode-toolbar-skeleton class="max-md:hidden" />
          <card-grid-skeleton class="md:mt-6" />
        </div>
      </template>
    </deck-shell>
  </section>
</template>
