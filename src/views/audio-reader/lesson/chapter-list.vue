<script setup lang="ts">
import { computed, toValue, type MaybeRef } from 'vue'
import { formatDuration } from '@/utils/audio-reader/duration'

// Intra-lesson chapter navigation: the auto-detected chapters of THIS lesson's
// audio (transcript.chapters), each jumping playback to its start by seeking the
// single audio element — distinct from the collection-lesson nav, which routes.

// Accept a Ref so the parent doesn't need to unwrap current_time in its template
// — passing a Ref by reference keeps the parent out of the 60fps subscription.
const { chapters, currentTime } = defineProps<{
  chapters: TranscriptChapter[]
  currentTime: MaybeRef<number>
}>()

const emit = defineEmits<{
  (e: 'seek', start: number): void
}>()

// The active chapter is the last one whose start time has been reached.
const active_index = computed(() => {
  const t = toValue(currentTime)
  let index = 0
  chapters.forEach((chapter, i) => {
    if (chapter.start <= t + 0.001) index = i
  })
  return index
})
</script>

<template>
  <nav
    data-testid="chapter-list"
    class="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-x-visible xl:overflow-y-auto xl:pb-0"
  >
    <button
      v-for="(chapter, i) in chapters"
      :key="i"
      data-testid="chapter-list__item"
      :data-active="i === active_index"
      type="button"
      class="flex shrink-0 cursor-pointer items-center gap-3 rounded-7 bg-brown-200 px-4 py-2 text-left text-brown-700 data-[active=true]:bg-blue-500 data-[active=true]:text-white xl:shrink dark:bg-stone-500 dark:text-brown-200 dark:data-[active=true]:bg-blue-650"
      @click="emit('seek', chapter.start)"
    >
      <span data-testid="chapter-list__time" class="shrink-0 text-base tabular-nums opacity-70">
        {{ formatDuration(chapter.start) }}
      </span>
      <span data-testid="chapter-list__title" class="line-clamp-1 text-base">
        {{ chapter.title }}
      </span>
    </button>
  </nav>
</template>
