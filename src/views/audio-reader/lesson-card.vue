<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { formatShortDate } from '@/utils/date'

const PHASE_KEYS: Record<LessonPhase, string> = {
  transcribing: 'audio-reader.lesson-card.phase-transcribing',
  chaptering: 'audio-reader.lesson-card.phase-chaptering',
  translating: 'audio-reader.lesson-card.phase-translating',
  transliterating: 'audio-reader.lesson-card.phase-transliterating'
}

const ERROR_KEYS: Record<string, string> = {
  timeout: 'audio-reader.lesson-error.timeout',
  rate_limited: 'audio-reader.lesson-error.rate-limited',
  file_too_large: 'audio-reader.lesson-error.file-too-large',
  invalid_audio: 'audio-reader.lesson-error.invalid-audio',
  upstream_error: 'audio-reader.lesson-error.upstream',
  audio_unavailable: 'audio-reader.lesson-error.audio-unavailable',
  stalled: 'audio-reader.lesson-error.stalled'
}

const { lesson } = defineProps<{ lesson: Lesson }>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'delete'): void
  (e: 'retry'): void
}>()

const { t } = useI18n()

const is_ready = computed(() => lesson.status === 'ready')
const is_processing = computed(() => lesson.status === 'processing')
const is_failed = computed(() => lesson.status === 'failed')

const status_icon = computed(() => {
  if (is_failed.value) return 'close'
  if (is_processing.value) return 'loading-dots'
  return 'music-note'
})

const icon_class = computed(() =>
  is_failed.value ? 'bg-red-500 text-white' : 'bg-blue-500 text-white dark:bg-blue-650'
)

const processing_label = computed(() =>
  lesson.phase ? PHASE_KEYS[lesson.phase] : 'audio-reader.lesson-card.processing-fallback'
)

const error_label = computed(
  () => ERROR_KEYS[lesson.error_code ?? ''] ?? 'audio-reader.lesson-error.unknown'
)
</script>

<template>
  <div
    data-testid="lesson-card"
    :data-status="lesson.status"
    class="group relative flex w-56 flex-col gap-3 rounded-7 bg-brown-200 p-4 text-left dark:bg-stone-500"
  >
    <button
      data-testid="lesson-card__open"
      type="button"
      class="flex cursor-pointer flex-col gap-3 text-left disabled:cursor-default"
      :disabled="!is_ready"
      @click="emit('open')"
    >
      <span
        data-testid="lesson-card__icon"
        class="flex size-10 items-center justify-center rounded-full"
        :class="icon_class"
      >
        <ui-icon :src="status_icon" class="h-5" />
      </span>

      <span data-testid="lesson-card__title" class="line-clamp-2 text-xl text-ink">
        {{ lesson.title }}
      </span>

      <span v-if="is_ready" data-testid="lesson-card__date" class="text-sm text-ink-muted">
        {{ formatShortDate(lesson.created_at ?? '') }}
      </span>

      <span
        v-else-if="is_processing"
        data-testid="lesson-card__status"
        class="text-base text-blue-500 dark:text-blue-400"
      >
        {{ t(processing_label) }}
      </span>

      <span
        v-else
        data-testid="lesson-card__status"
        class="text-base text-red-500 dark:text-red-400"
      >
        {{ t(error_label) }}
      </span>
    </button>

    <ui-button
      v-if="is_failed"
      data-testid="lesson-card__retry"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      icon-left="play"
      size="sm"
      full-width
      @press="emit('retry')"
    >
      {{ t('audio-reader.lesson-card.retry-button') }}
    </ui-button>

    <ui-button
      data-testid="lesson-card__delete"
      data-theme="grey-400"
      icon-left="delete"
      icon-only
      size="sm"
      class="absolute top-3 right-3 opacity-0 group-hover:opacity-100"
      @press="emit('delete')"
    >
      {{ t('audio-reader.lesson-card.delete-button') }}
    </ui-button>
  </div>
</template>
