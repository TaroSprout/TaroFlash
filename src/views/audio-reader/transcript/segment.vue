<script setup lang="ts">
import type { SentenceWords } from '@/utils/transcript'

const { group, index } = defineProps<{
  group: SentenceWords
  index: number
}>()
</script>

<template>
  <div
    data-testid="transcript-segment"
    :data-index="index"
    class="[content-visibility:auto] [contain-intrinsic-size:auto_12rem]"
  >
    <span data-testid="transcript-segment__source"
      ><ruby
        v-for="word in group.words"
        :key="word.index"
        data-testid="transcript-word"
        :data-word-index="word.index"
        :data-word-text="word.display"
        class="group/word cursor-pointer transition-colors duration-700 ease-out data-[playing=true]:duration-100 data-[active=true]:duration-100 data-[active=true]:text-white not-data-[active=true]:data-[playing=true]:text-blue-500 dark:not-data-[active=true]:data-[playing=true]:text-blue-650"
        ><span
          data-word-base
          class="inline-block origin-center leading-none transition-transform duration-700 ease-out group-data-[playing=true]/word:scale-115 group-data-[playing=true]/word:duration-100"
          >{{ word.display }}</span
        ><rt
          v-if="word.reading"
          data-testid="transcript-word__reading"
          class="-translate-y-1 select-none text-base text-brown-500 dark:text-grey-400"
          >{{ word.reading }}</rt
        ></ruby
      ></span
    >
    <span
      v-if="group.translation"
      data-testid="transcript-segment__translation"
      class="block text-lg text-brown-500 dark:text-brown-300 leading-[1.5]"
      >{{ group.translation }}</span
    >
  </div>
</template>
