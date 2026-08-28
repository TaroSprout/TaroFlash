<script setup lang="ts">
import MemberPolaroid from '@/components/member/member-polaroid.vue'

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
    <member-polaroid
      data-testid="feedback-skeleton__polaroid"
      size="sm"
      class="absolute top-2 left-0 z-10"
    >
      <template #photo>
        <div class="bg-skeleton shimmer relative h-full w-full"></div>
      </template>
    </member-polaroid>

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
