<script setup lang="ts">
import { computed, inject } from 'vue'
import { readerSelectionKey } from '@/composables/audio-reader/use-reader-highlights'

const { display, index, reading } = defineProps<{
  display: string
  index: number
  reading?: string
}>()

const selection = inject(readerSelectionKey, null)

const selected = computed(() => {
  const range = selection?.value
  return !!range && index >= range.lo && index <= range.hi
})
</script>

<template>
  <ruby
    data-testid="transcript-word"
    :data-word-index="index"
    :data-word-text="display"
    :data-active="selected"
    class="cursor-pointer transition-colors data-[active=true]:text-brown-100"
    ><span data-word-base>{{ display }}</span
    ><rt
      v-if="reading"
      data-testid="transcript-word__reading"
      class="-translate-y-1 select-none text-base text-brown-500 dark:text-grey-400"
      >{{ reading }}</rt
    ></ruby
  >
</template>
