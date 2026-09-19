<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import { useBookMeasure } from './composables/book-measure'

type BookMeasureProps = {
  paragraphs: SentenceWords[]
  width: number
}

const { paragraphs, width } = defineProps<BookMeasureProps>()

const measure_host = useTemplateRef<HTMLElement>('measure')
const band_host = useTemplateRef<HTMLElement>('band')

const { words, band_heights, rendered_paragraphs, bandHeightOf } = useBookMeasure({
  measure_host,
  band_host,
  paragraphs: () => paragraphs,
  width: () => width
})

defineExpose({ words, band_heights, bandHeightOf })
</script>

<template>
  <div
    aria-hidden="true"
    data-perf-ignore
    data-testid="book-measure"
    class="pointer-events-none invisible select-none"
  >
    <div
      ref="measure"
      data-testid="book-measure__words"
      class="fixed top-0 left-0 -z-10 text-4xl text-ink leading-[2.5]"
      :style="{ width: `${width}px` }"
    >
      <div
        v-for="paragraph in rendered_paragraphs"
        :key="paragraph.index"
        v-memo="[paragraph.index]"
        :data-paragraph="paragraph.index"
        class="mt-6 first:mt-0"
      >
        <ruby
          v-for="word in paragraph.words"
          :key="word.index"
          :data-word-index="word.index"
          :data-paragraph-index="paragraph.index"
          ><span class="inline-block leading-none">{{ word.display }}</span
          ><rt v-if="word.reading" class="-translate-y-1 text-base text-ink-muted">{{
            word.reading
          }}</rt></ruby
        >
      </div>
    </div>

    <div
      ref="band"
      data-testid="book-measure__bands"
      class="fixed top-0 left-0 -z-10"
      :style="{ width: `${width}px` }"
    >
      <template v-for="paragraph in rendered_paragraphs" :key="paragraph.index">
        <div
          v-if="paragraph.translation"
          v-memo="[paragraph.index]"
          :data-band-index="paragraph.index"
          class="border-t border-line pt-3 text-lg text-ink-muted leading-[1.5]"
        >
          {{ paragraph.translation }}
        </div>
      </template>
    </div>
  </div>
</template>
