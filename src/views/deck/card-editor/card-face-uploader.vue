<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import { useImageDropzone } from '@/composables/card-editor/use-image-dropzone'
import { useToast } from '@/composables/toast'
import { emitSfx } from '@/sfx/bus'
import { bytesToMbLabel } from '@/utils/file-size'

// Card images render small but are the app's highest-volume asset, so cap them
// well below the bucket's 10 MiB backstop.
const CARD_IMAGE_MAX_BYTES = 2 * 1024 * 1024

type CardFaceUploaderProps = {
  card: Card
  side: 'front' | 'back'
  disabled?: boolean
  error?: boolean
}

const { card, side, disabled = false, error = false } = defineProps<CardFaceUploaderProps>()

const { t } = useI18n()
const toast = useToast()
const { setFaceImage } = inject<CardListController>('card-editor')!

const hovered = ref(false)

const {
  dragging,
  error: file_error,
  accept,
  fileInput,
  browse,
  onFileChange,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop
} = useImageDropzone({
  maxBytes: CARD_IMAGE_MAX_BYTES,
  onFile: uploadFile
})

const image_path = computed(() => (side === 'front' ? card.front_image_path : card.back_image_path))
const has_image = computed(() => !!image_path.value)
// Image writes go through insert-backed RPCs that need a persisted row; temp
// cards (id <= 0) aren't saved yet, so disable upload until they are.
const can_upload = computed(() => (card.id ?? 0) > 0)
const active = computed(() => hovered.value || dragging.value)
const error_message = computed(() => {
  if (file_error.value === 'invalid-type') {
    return t('deck-view.card-editor.list-item.invalid-type-error')
  }
  if (file_error.value === 'too-large') {
    return t('deck-view.card-editor.list-item.too-large-error', {
      max: bytesToMbLabel(CARD_IMAGE_MAX_BYTES)
    })
  }
  return ''
})

async function uploadFile(file: File) {
  if (!can_upload.value) return

  try {
    await setFaceImage(card.id!, side, file)
    emitSfx('ui.snappy_button_2')
  } catch {
    toast.error(t('toast.error.card-image-upload-failed'))
  }
}

async function onRemove() {
  emitSfx('ui.trash_crumple_short')

  try {
    await setFaceImage(card.id!, side, null)
  } catch {
    toast.error(t('toast.error.card-image-delete-failed'))
  }
}

function onBrowse() {
  emitSfx('ui.select')
  browse()
}
</script>

<template>
  <card
    mode="edit"
    size="xl"
    :side="side"
    v-bind="card"
    :error="error"
    :data-active="active || undefined"
    :class="{ 'pointer-events-none': disabled }"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <input ref="fileInput" type="file" :accept="accept" class="sr-only" @change="onFileChange" />

    <ui-tooltip
      v-if="!has_image && can_upload && !disabled && !dragging"
      element="button"
      type="button"
      :text="t('deck-view.card-editor.list-item.upload-image-button')"
      position="top"
      :gap="4"
      data-testid="card-face-uploader__add"
      :aria-label="t('deck-view.card-editor.list-item.upload-image-button')"
      class="absolute! top-(--face-padding) right-(--face-padding) z-20 cursor-pointer text-brown-500 transition-[color,opacity] duration-150 hover:text-blue-500 dark:text-brown-100 dark:hover:text-blue-650"
      :class="hovered ? 'opacity-100' : 'opacity-0'"
      @click.stop="onBrowse"
    >
      <ui-icon src="add-image" class="size-7" />
    </ui-tooltip>

    <ui-button
      v-if="has_image && !disabled"
      data-testid="card-face-uploader__remove"
      icon-only
      icon-left="delete"
      data-theme="red-500"
      class="absolute! z-20 -translate-y-1/4 translate-x-1/4 transition-[top,right,opacity] duration-150 ease-[ease]"
      :class="
        active
          ? 'top-(--face-image-padding) right-(--face-image-padding) opacity-100 pointer-events-auto'
          : 'top-0 right-0 opacity-0 pointer-events-none'
      "
      @click.stop="onRemove"
    >
      {{ t('deck-view.card-editor.list-item.remove-image-button') }}
    </ui-button>

    <button
      v-if="!has_image && can_upload && (dragging || file_error)"
      type="button"
      data-testid="card-face-uploader__empty-overlay"
      :data-error="!!file_error || undefined"
      class="card-face-uploader__overlay card-face-uploader__overlay--full"
      @click.stop="onBrowse"
    >
      <ui-icon :src="file_error ? 'close' : 'add-image'" class="size-12" />
      <p v-if="file_error" class="text-sm">{{ error_message }}</p>
    </button>

    <button
      v-if="has_image && can_upload && !disabled"
      type="button"
      data-testid="card-face-uploader__scrim"
      :data-error="!!file_error || undefined"
      class="card-face-uploader__overlay card-face-uploader__overlay--inset"
      @click.stop="onBrowse"
    >
      <ui-icon :src="file_error ? 'close' : 'add-image'" class="size-12" />
      <p class="text-sm">
        {{ file_error ? error_message : t('deck-view.card-editor.list-item.replace-heading') }}
      </p>
    </button>

    <template #editor>
      <slot name="editor" />
    </template>
  </card>
</template>

<style>
.card-face-uploader__overlay {
  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-inline: 1rem;

  color: var(--color-brown-500);
  text-align: center;

  cursor: pointer;
  transition:
    inset 0.15s ease,
    opacity 0.15s ease,
    border-color 0.15s ease,
    border-radius 0.15s ease;
}

.card-face-uploader__overlay[data-error] {
  color: var(--color-red-500);
}

.card-face-uploader__overlay--full {
  inset: 0;
  border: 3px dashed var(--color-brown-500);
  border-radius: var(--face-radius);
  background-color: var(--color-white);
}

[data-theme='dark'] .card-face-uploader__overlay--full {
  background-color: var(--color-stone-700);
}

.card-face-uploader__overlay--full[data-error] {
  border-color: var(--color-red-500);
}

.card-face-uploader__overlay--inset {
  inset: 0;
  border-radius: var(--face-radius);
  background-color: color-mix(in srgb, var(--color-white) 85%, transparent);

  opacity: 0;
}

[data-theme='dark'] .card-face-uploader__overlay--inset {
  background-color: color-mix(in srgb, var(--color-stone-700) 85%, transparent);
}

.card-container--edit[data-active] .card-face-uploader__overlay--inset {
  inset: var(--face-image-padding);
  border-radius: calc(var(--face-radius) - var(--face-image-padding));

  opacity: 1;
}

.card-face-uploader__overlay--inset[data-error] {
  inset: var(--face-image-padding);
  border-radius: calc(var(--face-radius) - var(--face-image-padding));

  opacity: 1;
}
</style>
