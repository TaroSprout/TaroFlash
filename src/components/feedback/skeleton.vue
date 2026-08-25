<script setup lang="ts">
type FeedbackSkeletonProps = {
  count?: number
}

const { count = 4 } = defineProps<FeedbackSkeletonProps>()
</script>

<template>
  <div
    v-for="n in count"
    :key="n"
    data-testid="feedback-skeleton__item"
    class="bg-raised rounded-8 relative flex w-full items-start gap-4 p-6"
  >
    <div
      data-testid="feedback-skeleton__polaroid"
      data-station="float"
      class="bg-surface rounded-2 shadow-xs absolute top-2 left-0 z-10 w-24 -rotate-12 p-1.5 pb-5 select-none"
    >
      <div class="bg-mat rounded-1 relative aspect-square overflow-hidden">
        <div class="bg-skeleton shimmer absolute inset-0"></div>
      </div>
    </div>

    <div data-testid="feedback-skeleton__content" class="flex min-w-0 flex-1 flex-col gap-2 pl-24">
      <div class="bg-skeleton shimmer relative h-6 w-3/5 rounded-2"></div>
      <div class="bg-skeleton shimmer relative h-4 w-2/5 rounded-2"></div>
      <div class="bg-skeleton shimmer relative h-4 w-full rounded-2"></div>
    </div>

    <div
      data-testid="feedback-skeleton__vote-wrap"
      class="flex shrink-0 flex-col items-center gap-2"
    >
      <div class="bg-skeleton shimmer relative size-6 rounded-full"></div>
      <div class="bg-skeleton shimmer relative h-4 w-6 rounded-2"></div>
    </div>
  </div>
</template>
