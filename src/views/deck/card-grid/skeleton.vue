<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { deckViewShellKey, type CardGridSize } from '@/composables/deck/view-shell'
import { computed, inject, type CSSProperties } from 'vue'

const DEFAULT_COVER: DeckCover = {
  theme: 'brown-300',
  theme_dark: 'stone-900',
  pattern: 'diagonal-stripes'
}

const { grid_size } = inject(deckViewShellKey)!

const XL_CARD_WIDTH = 314
const CARD_SCALE: Record<CardGridSize, number> = {
  base: 0.6,
  md: 0.75,
  xl: 1
}

const card_scale = computed(() => CARD_SCALE[grid_size.value])

const grid_style = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(auto-fill, ${XL_CARD_WIDTH * card_scale.value}px)`
}))
</script>

<template>
  <div data-testid="card-grid-skeleton" class="w-full h-full md:min-h-0 overflow-hidden py-2">
    <div class="grid justify-center gap-4 opacity-30" :style="grid_style">
      <div
        v-for="n in 20"
        :key="n"
        data-testid="card-grid-skeleton__item"
        class="skeleton-item relative aspect-card w-full"
      >
        <card
          class="skeleton-item__card"
          :style="{ '--card-scale': card_scale }"
          size="xl"
          side="cover"
          shimmer
          :cover_config="DEFAULT_COVER"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-item :deep(.skeleton-item__card) {
  position: absolute;
  top: 0;
  left: 0;

  transform-origin: top left;
  transform: scale(var(--card-scale));
}
</style>
