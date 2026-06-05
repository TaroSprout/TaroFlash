<script setup lang="ts">
const { display, index, reading } = defineProps<{
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
    class="cursor-pointer"
    ><span data-word-base>{{ display }}</span
    ><rt
      v-if="reading"
      data-testid="transcript-word__reading"
      class="-translate-y-1 select-none text-base text-brown-500 dark:text-grey-400"
      >{{ reading }}</rt
    ></ruby
  >
</template>
