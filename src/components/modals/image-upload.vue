<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { emitSfx } from '@/sfx/bus'
import { playButtonTap } from '@/utils/animations/button-tap'
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
const promptIcon = useTemplateRef<HTMLElement>('promptIcon')

const preview = ref<string | null>(null)
const selected_file = ref<File | null>(null)
const drag_counter = ref(0)
const error = ref<FileError | null>(null)
// A fresh drop/pick leaves the pointer over the dropzone, which would trigger
// the replace overlay and hide the new preview. Suppress it until the pointer
// leaves once.
const overlay_suppressed = ref(false)

const dragging = computed(() => drag_counter.value > 0)
const show_error = computed(() => !!error.value && !preview.value)
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
  emitSfx('ui.select')
  if (promptIcon.value) playButtonTap(promptIcon.value, 0.5, { yoyo: true })
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
    overlay_suppressed.value = true
    emitSfx('ui.snappy_button_2')
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

function removeImage() {
  emitSfx('ui.trash_crumple_short')
  preview.value = null
  selected_file.value = null
  error.value = null
  overlay_suppressed.value = false
}
</script>

<template>
  <mobile-sheet
    data-testid="image-upload-container"
    data-theme="brown-500"
    data-theme-dark="stone-700"
    class="sm:w-fit"
    @close="close()"
  >
    <div
      data-testid="image-upload__body"
      class="flex flex-col items-center gap-10 px-12 pt-16 pb-6"
    >
      <div data-testid="image-upload__picker" class="flex flex-col items-center gap-3">
        <div data-testid="image-upload__frame" class="relative w-fit">
          <card size="xl">
            <template #front>
              <button
                ref="dropZone"
                type="button"
                data-testid="image-upload__dropzone"
                :data-dragging="dragging"
                :data-has-preview="!!preview"
                :data-error="show_error"
                :data-suppress-overlay="overlay_suppressed"
                class="image-upload__dropzone"
                v-sfx="{ hover: 'ui.click_07' }"
                @click="browse"
                @pointerleave="overlay_suppressed = false"
              >
                <img
                  v-if="preview"
                  data-testid="image-upload__preview"
                  :src="preview"
                  :alt="t('image-upload-modal.preview-alt')"
                  class="image-upload__image"
                />

                <div
                  v-if="show_error"
                  data-testid="image-upload__error"
                  class="image-upload__overlay text-red-500"
                >
                  <ui-icon src="close" class="size-12" />
                  <p class="text-sm">{{ error_message }}</p>
                </div>

                <div v-else data-testid="image-upload__prompt" class="image-upload__overlay">
                  <span ref="promptIcon" class="inline-flex">
                    <ui-icon src="add-image" class="size-12" />
                  </span>
                  <p class="text-sm">{{ t('image-upload-modal.drop-heading') }}</p>
                </div>
              </button>
            </template>
          </card>

          <ui-button
            v-if="preview"
            data-testid="image-upload__remove"
            icon-only
            icon-left="delete"
            data-theme="red-500"
            class="absolute! -top-1 -right-1 z-10"
            @click.stop="removeImage"
          >
            {{ t('image-upload-modal.remove-button') }}
          </ui-button>
        </div>

        <i18n-t
          keypath="image-upload-modal.restrictions"
          tag="p"
          data-testid="image-upload__restrictions"
          class="text-sm text-brown-500"
        >
          <template #format>
            <ui-tooltip
              element="span"
              :text="t('image-upload-modal.formats-list')"
              position="bottom"
              :fallback_placements="['bottom', 'right', 'left']"
              :gap="4"
              class="text-blue-500 cursor-pointer"
              static_on_mobile
            >
              {{ t('image-upload-modal.format-trigger') }}
            </ui-tooltip>
          </template>
          <template #max>{{ max_label }}</template>
        </i18n-t>
      </div>

      <div data-testid="image-upload__actions" class="flex w-full gap-3">
        <ui-button
          data-testid="image-upload__cancel"
          data-theme="brown-100"
          data-theme-dark="stone-700"
          icon-left="close"
          size="xl"
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
          size="xl"
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

<style>
.image-upload__dropzone {
  /* Fills the host `card`, borrowing its scoped --face-radius so the corner
     stays in sync with the card as its sizing evolves. The padding keeps the
     dashed frame + white background visible around a chosen image, signalling
     it's still replaceable. */
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 12px;

  border: 3px dashed var(--color-brown-500);
  border-radius: var(--face-radius);
  background-color: var(--color-white);

  cursor: pointer;
  transition: background-color 0.15s ease;
}

.image-upload__dropzone[data-dragging='true'] {
  background-color: var(--color-brown-100);
}

.image-upload__dropzone[data-error='true'] {
  border-color: var(--color-red-500);
}

.image-upload__dropzone:hover:not([data-error='true']) {
  border-color: var(--color-blue-500);
}

.image-upload__dropzone:hover:not([data-error='true']) .image-upload__overlay {
  color: var(--color-blue-500);
}

[data-theme='dark'] .image-upload__dropzone {
  background-color: var(--color-stone-700);
}

[data-theme='dark'] .image-upload__dropzone:hover:not([data-error='true']) {
  border-color: var(--color-blue-650);
}

[data-theme='dark'] .image-upload__dropzone:hover:not([data-error='true']) .image-upload__overlay {
  color: var(--color-blue-650);
}

.image-upload__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: calc(var(--face-radius) - 15px);
}

/* Prompt/error sit above the image, centered. With a chosen image they become
   a hover-only "replace" affordance, backed by a scrim so the text stays fully
   legible over any image. */
.image-upload__overlay {
  position: absolute;
  inset: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-inline: 1rem;
  text-align: center;
  border-radius: calc(var(--face-radius) - 15px);
  transition: opacity 0.15s ease;
}

.image-upload__dropzone[data-has-preview='true'] .image-upload__overlay {
  opacity: 0;
  background-color: color-mix(in srgb, var(--color-white) 85%, transparent);
}

.image-upload__dropzone[data-has-preview='true']:hover .image-upload__overlay {
  opacity: 1;
}

/* Right after a drop/pick the pointer is already over the dropzone — keep the
   replace overlay hidden until it leaves once, so the new preview is visible. */
.image-upload__dropzone[data-has-preview='true'][data-suppress-overlay='true']:hover
  .image-upload__overlay {
  opacity: 0;
}
</style>
