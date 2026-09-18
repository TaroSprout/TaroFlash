<script setup lang="ts">
import type { DisplayWord } from '@/utils/transcript'

type ReaderParagraphProps = {
  words: DisplayWord[]
  paragraphIndex: number
}

const { words, paragraphIndex } = defineProps<ReaderParagraphProps>()
</script>

<template>
  <div data-testid="reader-paragraph" :data-paragraph="paragraphIndex">
    <ruby
      v-for="word in words"
      :key="word.index"
      data-testid="reader-word"
      :data-word-index="word.index"
      :data-paragraph-index="paragraphIndex"
      :data-word-text="word.display"
      class="group/word cursor-pointer transition-colors duration-700 ease-out data-[playing=true]:duration-100 data-[active=true]:duration-100 data-[active=true]:text-(--color-on-accent) not-data-[active=true]:data-[playing=true]:text-(--color-accent-text)"
      ><span
        data-word-base
        class="inline-block origin-center rounded-2 leading-none transition-[transform,background-color] duration-700 ease-out group-data-[playing=true]/word:scale-115 group-data-[playing=true]/word:duration-100 group-data-[active=true]/word:-mx-0.75 group-data-[active=true]/word:-my-0.5 group-data-[active=true]/word:bg-(--color-accent) group-data-[active=true]/word:px-0.75 group-data-[active=true]/word:py-0.5 group-data-[active=true]/word:duration-100"
        >{{ word.display }}</span
      ><rt
        v-if="word.reading"
        data-testid="reader-word__reading"
        class="-translate-y-1 select-none text-base text-ink-muted"
        >{{ word.reading }}</rt
      ></ruby
    >
  </div>
</template>
