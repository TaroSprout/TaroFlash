<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import logger from '@/utils/logger'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export type ImageUploadModalResponse = File

type FileError = 'invalid-type' | 'too-large'

type ImageUploadModalProps = {
  close: (response?: ImageUploadModalResponse) => void
  max_bytes?: number
}

const { close, max_bytes = DEFAULT_MAX_BYTES } = defineProps<ImageUploadModalProps>()

const { t } = useI18n()

const dropZone = useTemplateRef<HTMLDivElement>('dropZone')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const preview = ref<string | null>(null)
const selected_file = ref<File | null>(null)
const drag_counter = ref(0)
const error = ref<FileError | null>(null)

const dragging = computed(() => drag_counter.value > 0)
const max_label = computed(() => `${+(max_bytes / 1024 / 1024).toFixed(1)} MB`)
const error_message = computed(() => {
  if (error.value === 'invalid-type') return t('image-upload-modal.invalid-type-error')
  if (error.value === 'too-large') {
    return t('image-upload-modal.too-large-error', { max: max_label.value })
  }
  return ''
})

onMounted(() => {
  const el = dropZone.value
  if (!el) return

  el.addEventListener('dragenter', onDragEnter)
  el.addEventListener('dragleave', onDragLeave)
  el.addEventListener('dragover', onDragOver)
  el.addEventListener('drop', onDrop)
})

onBeforeUnmount(() => {
  const el = dropZone.value
  if (!el) return

  el.removeEventListener('dragenter', onDragEnter)
  el.removeEventListener('dragleave', onDragLeave)
  el.removeEventListener('dragover', onDragOver)
  el.removeEventListener('drop', onDrop)
})

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  drag_counter.value++
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  drag_counter.value--
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  drag_counter.value = 0

  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function browse() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)

  // Reset so the same file can be re-selected.
  input.value = ''
}

async function processFile(file: File) {
  const file_error = fileError(file)
  if (file_error) {
    error.value = file_error
    return
  }

  error.value = null
  try {
    preview.value = await readPreview(file)
    selected_file.value = file
  } catch (err) {
    logger.error((err as Error).message)
  }
}

function fileError(file: File): FileError | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'invalid-type'
  if (file.size > max_bytes) return 'too-large'
  return null
}

function readPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = reject
    fr.onload = (e) => resolve(e.target!.result as string)
    fr.readAsDataURL(file)
  })
}

function onConfirm() {
  if (selected_file.value) close(selected_file.value)
}
</script>

<template>
  <mobile-sheet
    data-testid="image-upload-container"
    data-theme="yellow-500"
    data-theme-dark="yellow-800"
    class="sm:w-150"
    :title="t('image-upload-modal.title')"
    :pattern_config="{ pattern: 'aztec' }"
    @close="close()"
  >
    <div data-testid="image-upload__body" class="flex flex-col gap-6 p-6">
      <div
        ref="dropZone"
        data-testid="image-upload__dropzone"
        :data-dragging="dragging"
        :data-has-preview="!!preview"
        class="flex flex-col items-center justify-center gap-4 rounded-8 border-3 border-dashed border-brown-400 bg-brown-200 p-10 text-center transition-colors data-[dragging=true]:border-yellow-500 data-[dragging=true]:bg-brown-300"
      >
        <img
          v-if="preview"
          data-testid="image-upload__preview"
          :src="preview"
          :alt="t('image-upload-modal.preview-alt')"
          class="max-h-60 w-auto rounded-4 object-contain"
        />

        <template v-else>
          <ui-icon src="add-image" class="size-12 text-brown-500" />
          <p data-testid="image-upload__prompt" class="text-brown-600">
            {{ t('image-upload-modal.drop-heading') }}
          </p>
        </template>

        <p v-if="error" data-testid="image-upload__error" class="text-red-500">
          {{ error_message }}
        </p>

        <ui-button
          data-testid="image-upload__browse"
          data-theme="grey-400"
          icon-left="image"
          @click="browse"
        >
          {{
            preview ? t('image-upload-modal.replace-button') : t('image-upload-modal.browse-button')
          }}
        </ui-button>
      </div>

      <div data-testid="image-upload__actions" class="flex gap-3">
        <ui-button
          data-testid="image-upload__cancel"
          data-theme="grey-400"
          icon-left="close"
          size="lg"
          full-width
          @click="close()"
        >
          {{ t('image-upload-modal.cancel-button') }}
        </ui-button>

        <ui-button
          data-testid="image-upload__confirm"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="check"
          size="lg"
          full-width
          :disabled="!preview"
          @click="onConfirm"
        >
          {{ t('image-upload-modal.confirm-button') }}
        </ui-button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPT_ATTR"
      class="sr-only"
      @change="onFileChange"
    />
  </mobile-sheet>
</template>
