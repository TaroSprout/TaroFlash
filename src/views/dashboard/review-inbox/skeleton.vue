<script setup lang="ts">
import Card from '@/components/card/index.vue'

type ReviewInboxSkeletonProps = {
  count?: number
}

const { count = 6 } = defineProps<ReviewInboxSkeletonProps>()

const DEFAULT_COVER: DeckCover = {
  theme: 'brown-300',
  theme_dark: 'stone-900',
  pattern: 'diagonal-stripes'
}
</script>

<template>
  <div
    data-testid="review-inbox-skeleton"
    class="relative w-full flex gap-3 overflow-hidden pt-1.5 -mt-1.5"
  >
    <card
      v-for="n in count"
      :key="n"
      side="cover"
      size="xs"
      shimmer
      :cover_config="DEFAULT_COVER"
      class="shrink-0"
    />
  </div>
</template>
