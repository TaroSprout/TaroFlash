<script setup lang="ts">
// Lines per skeleton page, and their widths, roughly tracing a page of prose so
// the placeholder reads as a book page rather than a generic block.
const LINE_WIDTHS = [
  'w-full',
  'w-11/12',
  'w-full',
  'w-10/12',
  'w-full',
  'w-9/12',
  'w-full',
  'w-11/12',
  'w-8/12'
]
</script>

<template>
  <div
    data-testid="reader-skeleton"
    class="flex h-full w-full flex-col justify-start gap-6 px-5 pt-8 sm:px-14 sm:pt-20 lg:px-20"
  >
    <span
      v-for="(width, i) in LINE_WIDTHS"
      :key="i"
      data-testid="reader-skeleton__line"
      class="shimmer relative h-8 rounded-2 bg-skeleton"
      :class="width"
    />
  </div>
</template>
