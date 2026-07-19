<script setup lang="ts">
defineProps<{
  display: string
  index: number
  reading?: string
}>()
</script>

<template>
  <ruby
    data-testid="transcript-word"
    :data-word-index="index"
    :data-word-text="display"
    class="group/word cursor-pointer transition-colors duration-700 ease-out data-[playing=true]:duration-100 data-[active=true]:duration-100 data-[active=true]:text-white not-data-[active=true]:data-[playing=true]:text-blue-500 dark:not-data-[active=true]:data-[playing=true]:text-blue-650"
    ><span
      data-word-base
      class="inline-block origin-center leading-none transition-transform duration-700 ease-out group-data-[playing=true]/word:scale-115 group-data-[playing=true]/word:duration-100"
      >{{ display }}</span
    ><rt
      v-if="reading"
      data-testid="transcript-word__reading"
      class="-translate-y-1 select-none text-base text-brown-500 dark:text-brown-300"
      >{{ reading }}</rt
    ></ruby
  >
</template>
