<script setup lang="ts">
import ReaderParagraph from './paragraph.vue'
import type { PageSlice } from '@/utils/reader/slices'

type ReaderPageProps = {
  slices: PageSlice[]
}

const { slices } = defineProps<ReaderPageProps>()
</script>

<template>
  <div
    data-testid="reader-page"
    class="h-full select-none overflow-hidden text-4xl leading-[2.5] text-ink"
  >
    <reader-paragraph
      v-for="(slice, i) in slices"
      :key="`${slice.paragraph_index}-${slice.words[0]?.index}`"
      :class="{ 'mt-6': i > 0 }"
      :words="slice.words"
      :paragraph-index="slice.paragraph_index"
    />
  </div>
</template>
