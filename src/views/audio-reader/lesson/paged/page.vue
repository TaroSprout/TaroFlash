<script setup lang="ts">
import PagedSegment from '@/views/audio-reader/lesson/paged/segment.vue'
import type { Page } from '@/composables/audio-reader/pagination'

type PagedPageProps = {
  slices: Page
}

const { slices } = defineProps<PagedPageProps>()
</script>

<template>
  <div
    data-testid="paged-page"
    class="h-full select-none overflow-hidden text-4xl leading-[2.5] text-ink"
  >
    <paged-segment
      v-for="(slice, i) in slices"
      :key="`${slice.paragraph_index}-${slice.words[0]?.index}`"
      :class="{ 'mt-6': i > 0 }"
      :words="slice.words"
      :paragraph-index="slice.paragraph_index"
      :translation="slice.translation"
      :show-gloss="slice.show_gloss"
    />
  </div>
</template>
