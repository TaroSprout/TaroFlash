<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import ScriptSelect from './script-select.vue'
import { useStartLessonMutation, EdgeFunctionError } from '@/api/lessons'

export type UploadLessonResponse = Lesson | undefined

// Whisper's per-file cap (also the bucket's file_size_limit). Validated here so
// an over-cap file fails instantly instead of after an upload round-trip.
const MAX_BYTES = 26214400

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

const can_submit = computed(() => title.value.trim().length > 0 && file.value !== null)

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
  try {
    // Returns once the lesson row exists in `processing`; transcription runs in
    // the background and the collection view polls it to completion.
    const lesson = await start.mutateAsync({
      collection_id,
      title: title.value.trim(),
      file: file.value,
      script: script.value
    })
    close(lesson)
  } catch (error) {
    error_key.value = errorKeyFor(error)
  } finally {
    is_submitting.value = false
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
  <mobile-sheet
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
        class="flex cursor-pointer items-center gap-3 rounded-7 border-2 border-dashed border-brown-400 p-4 text-brown-600 dark:border-grey-600 dark:text-grey-300"
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

      <div data-testid="upload-lesson__actions" class="flex gap-3">
        <ui-button
          data-theme="grey-400"
          icon-left="close"
          size="lg"
          full-width
          :disabled="is_submitting"
          @click="close(undefined)"
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
          @click="onSubmit"
        >
          {{ t('audio-reader.upload.submit-button') }}
        </ui-button>
      </div>
    </div>
  </mobile-sheet>
</template>
