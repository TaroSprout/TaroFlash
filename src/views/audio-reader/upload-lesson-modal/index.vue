<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiProgressBar from '@/components/ui-kit/progress-bar.vue'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import ScriptSelect from './script-select.vue'
import { useStartLessonMutation, EdgeFunctionError } from '@/api/lessons'
import type { LessonUploadProgress } from '@/api/lessons'

export type UploadLessonResponse = Lesson | undefined

// A generous sanity cap on the SOURCE file: long audio is fine (it's chunked),
// but ffmpeg.wasm decodes the original in memory, so a huge file would OOM the
// tab. This is NOT Whisper's old 25 MiB cap — the client compresses + slices.
const MAX_BYTES = 629145600

const { collection_id, close } = defineProps<{
  collection_id: number
  close: (response?: UploadLessonResponse) => void
}>()

const { t } = useI18n()
const start = useStartLessonMutation()

const title = ref('')
const file = ref<File | null>(null)
const script = ref<TranscriptScript>('original')
const error_key = ref<string | null>(null)
const is_submitting = ref(false)
const progress = ref<LessonUploadProgress | null>(null)

const can_submit = computed(() => title.value.trim().length > 0 && file.value !== null)

// One monotonic 0–100 bar across the stages: transcode (the long one) dominates,
// then slicing, then upload. Only 'uploading' reads as such; the preprocessing
// stages collapse into a single "Processing audio…".
const progress_value = computed(() => {
  const p = progress.value
  if (!p) return 0
  const r = p.ratio ?? 0
  if (p.stage === 'loading') return 3
  if (p.stage === 'transcoding') return 5 + r * 55
  if (p.stage === 'slicing') return 60 + r * 15
  return 75 + r * 25
})

const progress_label = computed(() =>
  progress.value?.stage === 'uploading'
    ? t('audio-reader.upload.progress-uploading')
    : t('audio-reader.upload.progress-processing')
)

function onFileChange(event: Event) {
  error_key.value = null
  const picked = (event.target as HTMLInputElement).files?.[0] ?? null

  if (picked && picked.size > MAX_BYTES) {
    file.value = null
    error_key.value = 'audio-reader.upload.too-large-error'
    return
  }

  file.value = picked
  if (picked && !title.value) title.value = picked.name.replace(/\.[^.]+$/, '')
}

async function onSubmit() {
  if (!can_submit.value || !file.value) return

  error_key.value = null
  is_submitting.value = true
  progress.value = { stage: 'loading' }
  try {
    // Returns once the lesson row exists in `processing`; transcription runs in
    // the background and the collection view polls it to completion. Preprocessing
    // (transcode + slice) and upload happen here, reported through onProgress.
    const lesson = await start.mutateAsync({
      collection_id,
      title: title.value.trim(),
      file: file.value,
      script: script.value,
      onProgress: (p) => (progress.value = p)
    })
    close(lesson)
  } catch (error) {
    error_key.value = errorKeyFor(error)
  } finally {
    is_submitting.value = false
    progress.value = null
  }
}

function errorKeyFor(error: unknown): string {
  if (!(error instanceof EdgeFunctionError)) return 'audio-reader.upload.generic-error'
  if (error.code === 'file_too_large') return 'audio-reader.upload.too-large-error'
  if (error.code === 'invalid_audio') return 'audio-reader.upload.invalid-error'
  return 'audio-reader.upload.generic-error'
}
</script>

<template>
  <app-window
    data-testid="upload-lesson-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="sm:w-150"
    :title="t('audio-reader.upload.title')"
    @close="close(undefined)"
  >
    <div data-testid="upload-lesson__body" class="flex flex-col gap-5 p-6">
      <ui-input
        data-testid="upload-lesson__title"
        :placeholder="t('audio-reader.upload.title-placeholder')"
        size="lg"
        v-model:value="title"
      />

      <label
        data-testid="upload-lesson__file"
        class="flex cursor-pointer items-center gap-3 rounded-7 border-2 border-dashed border-brown-500 p-4 text-brown-700 dark:border-stone-500 dark:text-brown-300"
      >
        <ui-icon src="music-note" class="h-5" />
        <span data-testid="upload-lesson__file-name">
          {{ file?.name ?? t('audio-reader.upload.file-placeholder') }}
        </span>
        <input type="file" accept="audio/*" class="hidden" @change="onFileChange" />
      </label>

      <script-select v-model="script" />

      <p
        v-if="error_key"
        data-testid="upload-lesson__error"
        class="text-sm text-red-500 dark:text-red-400"
      >
        {{ t(error_key) }}
      </p>

      <div v-if="is_submitting" data-testid="upload-lesson__progress" class="flex flex-col gap-2">
        <ui-progress-bar :value="progress_value" :label="progress_label" />
        <p data-testid="upload-lesson__progress-hint" class="text-sm text-ink">
          {{ t('audio-reader.upload.progress-hint') }}
        </p>
      </div>

      <div data-testid="upload-lesson__actions" class="flex gap-3">
        <ui-button
          data-theme="grey-400"
          icon-left="close"
          size="lg"
          full-width
          :disabled="is_submitting"
          @press="close(undefined)"
        >
          {{ t('audio-reader.upload.cancel-button') }}
        </ui-button>

        <ui-button
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="add"
          size="lg"
          full-width
          :disabled="!can_submit"
          :loading="is_submitting"
          @press="onSubmit"
        >
          {{ t('audio-reader.upload.submit-button') }}
        </ui-button>
      </div>
    </div>
  </app-window>
</template>
