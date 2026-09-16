<script setup lang="ts">
import type { DisplayWord } from '@/utils/transcript'

type PagedSegmentProps = {
  words: DisplayWord[]
  paragraphIndex: number
  translation?: string
  // Render the interlinear gloss under the words (gloss mode, closing slice only).
  showGloss?: boolean
  // Tag the last word so the pagination pass can measure the word + its gloss as
  // one atom. Only the full-paragraph render in the measure host needs this.
  endsParagraph?: boolean
}

const {
  words,
  paragraphIndex,
  translation,
  showGloss = false,
  endsParagraph = false
} = defineProps<PagedSegmentProps>()
</script>

<template>
  <div data-testid="paged-segment" :data-paragraph-index="paragraphIndex">
    <span data-testid="paged-segment__source"
      ><ruby
        v-for="(word, i) in words"
        :key="word.index"
        data-testid="paged-word"
        :data-word-index="word.index"
        :data-paragraph-index="paragraphIndex"
        :data-word-text="word.display"
        :data-last-in-paragraph="endsParagraph && i === words.length - 1 ? '' : undefined"
        class="group/word cursor-pointer transition-colors duration-700 ease-out data-[playing=true]:duration-100 data-[active=true]:duration-100 data-[active=true]:text-(--color-on-accent) not-data-[active=true]:data-[playing=true]:text-(--color-accent-text)"
        ><span
          data-word-base
          class="inline-block origin-center leading-none transition-transform duration-700 ease-out group-data-[playing=true]/word:scale-115 group-data-[playing=true]/word:duration-100"
          >{{ word.display }}</span
        ><rt
          v-if="word.reading"
          data-testid="paged-word__reading"
          class="-translate-y-1 select-none text-base text-ink-muted"
          >{{ word.reading }}</rt
        ></ruby
      ></span
    >
    <span
      v-if="translation && showGloss"
      data-gloss
      data-testid="paged-segment__translation"
      class="block text-lg text-ink-muted leading-[1.5]"
      >{{ translation }}</span
    >
  </div>
</template>
