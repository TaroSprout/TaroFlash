<script setup lang="ts">
type LayoutSkeletonProps = {
  layout: CardImageLayout
}

const { layout } = defineProps<LayoutSkeletonProps>()
</script>

<template>
  <div
    data-testid="layout-skeleton"
    :data-layout="layout"
    class="relative h-full w-full overflow-hidden rounded-(--face-radius) bg-brown-100 dark:bg-stone-700 p-3"
  >
    <div
      class="flex h-full w-full flex-col justify-center gap-3"
      :class="{ 'flex-col-reverse': layout === 'above' }"
    >
      <div
        data-testid="layout-skeleton__text"
        class="flex shrink-0 flex-col gap-1 items-center z-1"
      >
        <span class="h-1.5 w-3/4 rounded-full bg-brown-500"></span>
        <span class="h-1.5 w-1/2 rounded-full bg-brown-500"></span>
      </div>
      <div
        data-testid="layout-skeleton__image"
        class="grow rounded-[calc(var(--face-radius)-var(--face-padding))] bg-surface"
        :class="{ 'absolute inset-1': layout === 'behind' }"
      ></div>
    </div>
  </div>
</template>
