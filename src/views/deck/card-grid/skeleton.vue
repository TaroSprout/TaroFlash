<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { useCardGrid } from './use-card-grid'
import { type CardGridSize } from '@/views/deck/composables/view-shell'

type CardGridSkeletonProps = {
  shimmer?: boolean
  size?: CardGridSize
  count?: number
}

const { shimmer = true, size = 'md', count = 40 } = defineProps<CardGridSkeletonProps>()

const DEFAULT_COVER: DeckCover = {
  theme: 'brown-300',
  theme_dark: 'stone-900',
  pattern: 'diagonal-stripes'
}

const { card_scale, grid_style, grid_classes } = useCardGrid(() => size)
</script>

<template>
  <div data-testid="card-grid-skeleton" class="w-full h-full md:min-h-0 overflow-hidden py-2">
    <div class="opacity-30" :class="grid_classes" :style="grid_style">
      <div
        v-for="n in count"
        :key="n"
        data-testid="card-grid-skeleton__item"
        class="skeleton-item relative aspect-card w-full"
      >
        <card
          class="skeleton-item__card"
          :style="{ '--card-scale': card_scale }"
          size="xl"
          side="cover"
          :shimmer="shimmer"
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
