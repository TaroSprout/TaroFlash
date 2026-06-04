<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/toast'
import { useLessonQuery, useLessonAudioUrlQuery } from '@/api/lessons'
import { useAudioPlayer } from '@/composables/use-audio-player'
import { useTranscriptSync } from '@/composables/use-transcript-sync'
import TranscriptView, { type TermSelection } from '@/components/audio-reader/transcript-view.vue'
import TermPopover from '@/components/audio-reader/term-popover.vue'

// Translate into the app language. A per-member target language can replace this
// later; admin-only v1 is English.
const TARGET_LANG = 'English'

const { id } = defineProps<{ id: string }>()

const { t } = useI18n()
const toast = useToast()

const lesson_id = computed(() => Number(id))
const { data: lesson, error } = useLessonQuery(lesson_id)
const segments = computed(() => lesson.value?.transcript.segments ?? [])

const audio_path = computed(() => lesson.value?.audio_path)
const { data: audio_url } = useLessonAudioUrlQuery(audio_path)

const audio_el = useTemplateRef<HTMLAudioElement>('audio')
const { current_time, seek } = useAudioPlayer(audio_el)
const { active_index } = useTranscriptSync(segments, current_time)

const selection = ref<TermSelection | null>(null)
const popover_open = ref(false)

watch(error, (err) => {
  if (err) toast.error(err.message)
})

function onSeek(index: number) {
  const segment = segments.value[index]
  if (segment) seek(segment.start)
}

function onSelect(next: TermSelection) {
  selection.value = next
  popover_open.value = true
}
</script>

<template>
  <div data-testid="audio-reader-lesson" class="flex h-full flex-col gap-6 pb-12">
    <h1
      data-testid="audio-reader-lesson__title"
      class="text-3xl text-brown-700 dark:text-brown-300"
    >
      {{ lesson?.title }}
    </h1>

    <audio
      ref="audio"
      data-testid="audio-reader-lesson__audio"
      :src="audio_url ?? undefined"
      controls
      class="w-full"
    />

    <transcript-view
      :segments="segments"
      :active_index="active_index"
      @seek="onSeek"
      @select="onSelect"
    />

    <term-popover
      v-if="selection"
      :open="popover_open"
      :rect="selection.rect"
      :term="selection.term"
      :sentence="selection.sentence"
      :target_lang="TARGET_LANG"
      @close="popover_open = false"
    />
  </div>
</template>
