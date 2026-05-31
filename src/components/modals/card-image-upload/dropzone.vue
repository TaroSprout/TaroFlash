<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { emitSfx } from '@/sfx/bus'
import { playButtonTap } from '@/utils/animations/button-tap'
import { bytesToMbLabel } from '@/utils/file-size'
import logger from '@/utils/logger'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')

// The face's pending change, resolved by the parent modal on confirm:
//   File      — a new image to upload
//   null      — an existing image was removed
//   undefined — untouched, nothing to apply
export type FaceImage = File | null | undefined

type FileError = 'invalid-type' | 'too-large'

type DropzoneProps = {
  max_bytes: number
  existing_image?: string
}

const { max_bytes, existing_image } = defineProps<DropzoneProps>()

const result = defineModel<FaceImage>()

const { t } = useI18n()

const dropZone = useTemplateRef<HTMLButtonElement>('dropZone')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const promptIcon = useTemplateRef<HTMLElement>('promptIcon')

const preview = ref<string | null>(existing_image ?? null)
const drag_counter = ref(0)
const error = ref<FileError | null>(null)
// A fresh drop/pick leaves the pointer over the dropzone, which would trigger
// the replace overlay and hide the new preview. Suppress it until the pointer
// leaves once.
const overlay_suppressed = ref(false)

const dragging = computed(() => drag_counter.value > 0)
const show_error = computed(() => !!error.value && !preview.value)
const max_label = computed(() => bytesToMbLabel(max_bytes))
const error_message = computed(() => {
  if (error.value === 'invalid-type') return t('card-image-upload-modal.invalid-type-error')
  if (error.value === 'too-large') {
    return t('card-image-upload-modal.too-large-error', { max: max_label.value })
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
    result.value = file
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

// Clearing an existing image is a removal (null); clearing one the user just
// picked simply returns the face to untouched (undefined).
function removeImage() {
  emitSfx('ui.trash_crumple_short')
  preview.value = null
  error.value = null
  overlay_suppressed.value = false
  result.value = existing_image ? null : undefined
}
</script>

<template>
  <div data-testid="card-image-dropzone" class="relative w-fit">
    <card size="xl">
      <template #front>
        <button
          ref="dropZone"
          type="button"
          data-testid="card-image-dropzone__zone"
          :data-dragging="dragging"
          :data-has-preview="!!preview"
          :data-error="show_error"
          :data-suppress-overlay="overlay_suppressed"
          class="card-image-dropzone__zone"
          v-sfx="{ hover: 'ui.click_07' }"
          @click="browse"
          @pointerleave="overlay_suppressed = false"
        >
          <img
            v-if="preview"
            data-testid="card-image-dropzone__preview"
            :src="preview"
            :alt="t('card-image-upload-modal.preview-alt')"
            class="card-image-dropzone__image"
          />

          <div
            v-if="show_error"
            data-testid="card-image-dropzone__error"
            class="card-image-dropzone__overlay text-red-500"
          >
            <ui-icon src="close" class="size-12" />
            <p class="text-sm">{{ error_message }}</p>
          </div>

          <div
            v-else
            data-testid="card-image-dropzone__prompt"
            class="card-image-dropzone__overlay"
          >
            <span ref="promptIcon" class="inline-flex">
              <ui-icon src="add-image" class="size-12" />
            </span>
            <p class="text-sm">{{ t('card-image-upload-modal.drop-heading') }}</p>
          </div>
        </button>
      </template>
    </card>

    <ui-button
      v-if="preview"
      data-testid="card-image-dropzone__remove"
      icon-only
      icon-left="delete"
      data-theme="red-500"
      class="absolute! -top-1 -right-1 z-10"
      @click.stop="removeImage"
    >
      {{ t('card-image-upload-modal.remove-button') }}
    </ui-button>

    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPT_ATTR"
      class="sr-only"
      @change="onFileChange"
    />
  </div>
</template>

<style>
.card-image-dropzone__zone {
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

.card-image-dropzone__zone[data-dragging='true'] {
  background-color: var(--color-brown-100);
}

.card-image-dropzone__zone[data-error='true'] {
  border-color: var(--color-red-500);
}

.card-image-dropzone__zone:hover:not([data-error='true']) {
  border-color: var(--color-blue-500);
}

.card-image-dropzone__zone:hover:not([data-error='true']) .card-image-dropzone__overlay {
  color: var(--color-blue-500);
}

[data-theme='dark'] .card-image-dropzone__zone {
  background-color: var(--color-stone-700);
}

[data-theme='dark'] .card-image-dropzone__zone:hover:not([data-error='true']) {
  border-color: var(--color-blue-650);
}

[data-theme='dark']
  .card-image-dropzone__zone:hover:not([data-error='true'])
  .card-image-dropzone__overlay {
  color: var(--color-blue-650);
}

.card-image-dropzone__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: calc(var(--face-radius) - 15px);
}

/* Prompt/error sit above the image, centered. With a chosen image they become
   a hover-only "replace" affordance, backed by a scrim so the text stays fully
   legible over any image. */
.card-image-dropzone__overlay {
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

.card-image-dropzone__zone[data-has-preview='true'] .card-image-dropzone__overlay {
  opacity: 0;
  background-color: color-mix(in srgb, var(--color-white) 85%, transparent);
}

.card-image-dropzone__zone[data-has-preview='true']:hover .card-image-dropzone__overlay {
  opacity: 1;
}

/* Right after a drop/pick the pointer is already over the dropzone — keep the
   replace overlay hidden until it leaves once, so the new preview is visible. */
.card-image-dropzone__zone[data-has-preview='true'][data-suppress-overlay='true']:hover
  .card-image-dropzone__overlay {
  opacity: 0;
}
</style>
