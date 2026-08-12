<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { SKELETON_COVER } from '@/utils/cover'

type ReviewInboxSkeletonProps = {
  count?: number
}

const { count = 6 } = defineProps<ReviewInboxSkeletonProps>()
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
      <card side="cover" class="w-(--card-w-2xs)" shimmer :cover_config="SKELETON_COVER" />

      <div
        data-testid="review-inbox-skeleton__label"
        class="h-5 w-16 bg-skeleton rounded-2 animate-pulse"
      ></div>
    </div>
  </div>
</template>
