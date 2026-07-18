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
    <div
      v-for="n in count"
      :key="n"
      data-testid="review-inbox-skeleton__item"
      class="flex flex-col items-center gap-2.5 shrink-0"
    >
      <card side="cover" class="w-[102px]" shimmer :cover_config="DEFAULT_COVER" />

      <div
        data-testid="review-inbox-skeleton__label"
        class="h-5 w-16 bg-brown-200 dark:bg-grey-800 rounded-2 animate-pulse"
      ></div>
    </div>
  </div>
</template>
