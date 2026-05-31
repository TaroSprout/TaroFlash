<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  ref,
  useTemplateRef,
  watch,
  type ComponentPublicInstance
} from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import { useImageDropzone } from '@/composables/card-editor/use-image-dropzone'
import { useToast } from '@/composables/toast'
import { emitSfx } from '@/sfx/bus'
import { playButtonTap } from '@/utils/animations/button-tap'
import { bytesToMbLabel } from '@/utils/file-size'

// Card images render small but are the app's highest-volume asset, so cap them
// well below the bucket's 10 MiB backstop.
const CARD_IMAGE_MAX_BYTES = 2 * 1024 * 1024

// A fresh drop/pick leaves the pointer over the card; suppress the replace
// scrim so the new image is visible, until the pointer leaves or this elapses.
const SUPPRESS_HOVER_MS = 1000

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

const addIcon = useTemplateRef<HTMLElement>('addIcon')
const cardRef = useTemplateRef<ComponentPublicInstance>('cardRef')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const hovered = ref(false)
const hover_suppressed = ref(false)
let suppress_timer: ReturnType<typeof setTimeout> | undefined

const {
  dragging,
  error: file_error,
  clearError,
  accept,
  browse,
  onFileChange,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop
} = useImageDropzone({
  maxBytes: CARD_IMAGE_MAX_BYTES,
  fileInput,
  onFile: uploadFile,
  onError: () => emitSfx('ui.digi_powerdown')
})

const image_path = computed(() => (side === 'front' ? card.front_image_path : card.back_image_path))
const has_image = computed(() => !!image_path.value)
// Image writes go through insert-backed RPCs that need a persisted row; temp
// cards (id <= 0) aren't saved yet, so disable upload until they are.
const can_upload = computed(() => (card.id ?? 0) > 0)
// Keep the image in its hover (padded/rounded) state behind a visible error
// scrim so it doesn't pop back to full-bleed underneath the overlay.
const active = computed(
  () => ((hovered.value || dragging.value) && !hover_suppressed.value) || !!file_error.value
)
// While a drag or error overlay covers the editor, make it inert: the user
// can't see what's behind the scrim, so they shouldn't be able to focus it
// (which would show a stray blue focus ring) or type into it.
const covered = computed(() => dragging.value || !!file_error.value)
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

onBeforeUnmount(() => {
  clearTimeout(suppress_timer)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

async function uploadFile(file: File) {
  if (!can_upload.value) return

  suppressHover()

  try {
    await setFaceImage(card.id!, side, file)
    emitSfx('ui.music_plink_ok', { blocking: true })
  } catch {
    toast.error(t('toast.error.card-image-upload-failed'))
  }
}

async function onRemove() {
  emitSfx('ui.trash_crumple_short')
  clearError()

  try {
    await setFaceImage(card.id!, side, null)
  } catch {
    toast.error(t('toast.error.card-image-delete-failed'))
  }
}

function onBrowse() {
  emitSfx('ui.select')
  if (addIcon.value) playButtonTap(addIcon.value, 0.35, { yoyo: true })
  browse()
}

// A fresh drop/pick lands with the pointer still over the card, which would
// immediately reveal the replace scrim over the new image. Hold the hover state
// off until the pointer leaves once, or until the timeout releases it.
function suppressHover() {
  hover_suppressed.value = true
  clearTimeout(suppress_timer)
  suppress_timer = setTimeout(() => (hover_suppressed.value = false), SUPPRESS_HOVER_MS)
}

function onPointerEnter() {
  hovered.value = true
}

function onPointerLeave() {
  hovered.value = false
  clearTimeout(suppress_timer)
  hover_suppressed.value = false
}

// Dismiss a lingering error when the user commits attention to another card.
function onDocumentPointerDown(e: PointerEvent) {
  const root = cardRef.value?.$el as HTMLElement | undefined
  if (root && !root.contains(e.target as Node)) clearError()
}

// Chime once when a drag first enters the card (not on every child dragenter).
watch(dragging, (now, was) => {
  if (now && !was && can_upload.value) emitSfx('ui.music_plink_mid')
})

// Only listen for outside clicks while an error is actually showing.
watch(file_error, (err) => {
  if (err) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <card
    ref="cardRef"
    mode="edit"
    size="xl"
    :side="side"
    v-bind="card"
    :error="error"
    :sfx="has_image ? { hover: 'ui.click_07' } : undefined"
    :data-active="active || undefined"
    :data-dragging="dragging || undefined"
    :class="{ 'pointer-events-none': disabled }"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
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
      theme="blue-500"
      theme-dark="blue-650"
      data-testid="card-face-uploader__add"
      :aria-label="t('deck-view.card-editor.list-item.upload-image-button')"
      class="absolute! top-(--face-padding) right-(--face-padding) z-20 cursor-pointer text-brown-500 transition-[color,opacity] duration-150 hover:text-blue-500 dark:text-brown-100 dark:hover:text-blue-650"
      :class="hovered ? 'opacity-100' : 'opacity-0'"
      v-sfx="{ hover: 'ui.click_07' }"
      @click.stop="onBrowse"
    >
      <span ref="addIcon" class="inline-flex">
        <ui-icon src="add-image" class="size-7" />
      </span>
    </ui-tooltip>

    <ui-button
      v-if="has_image && !disabled"
      data-testid="card-face-uploader__remove"
      icon-only
      icon-left="remove-image"
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
      v-if="!has_image && can_upload && dragging && !file_error"
      type="button"
      data-testid="card-face-uploader__empty-overlay"
      class="card-face-uploader__overlay card-face-uploader__overlay--full"
      @click.stop="onBrowse"
    >
      <ui-icon src="add-image" class="size-12" />
    </button>

    <button
      v-if="has_image && can_upload && !disabled && !file_error"
      type="button"
      data-testid="card-face-uploader__scrim"
      class="card-face-uploader__overlay card-face-uploader__overlay--inset"
      @click.stop="onBrowse"
    >
      <ui-icon src="add-image" class="size-12" />
      <p class="text-sm">{{ t('deck-view.card-editor.list-item.replace-heading') }}</p>
    </button>

    <div
      v-if="file_error"
      data-testid="card-face-uploader__error"
      data-error
      class="card-face-uploader__overlay"
      :class="
        has_image ? 'card-face-uploader__overlay--inset' : 'card-face-uploader__overlay--full'
      "
      @mousedown.stop
      @click.stop="onBrowse"
    >
      <ui-icon src="close" class="size-12" />
      <p class="text-sm">{{ error_message }}</p>
      <ui-button
        data-testid="card-face-uploader__dismiss-error"
        size="sm"
        data-theme="red-500"
        @click.stop="clearError"
      >
        {{ t('deck-view.card-editor.list-item.dismiss-error-button') }}
      </ui-button>
    </div>

    <template #editor>
      <div
        data-testid="card-face-uploader__editor"
        :inert="covered || undefined"
        class="h-full w-full"
      >
        <slot name="editor" />
      </div>
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
  border: 3px dashed var(--color-blue-500);
  border-radius: var(--face-radius);
  background-color: var(--color-white);

  color: var(--color-blue-500);
}

[data-theme='dark'] .card-face-uploader__overlay--full {
  background-color: var(--color-stone-700);
}

[data-theme='dark'] .card-face-uploader__overlay--full:not([data-error]) {
  border-color: var(--color-blue-650);
  color: var(--color-blue-650);
}

.card-face-uploader__overlay--full[data-error] {
  border-color: var(--color-red-500);
}

.card-face-uploader__overlay--inset {
  inset: 0;
  border-radius: var(--face-radius);
  background-color: color-mix(in srgb, var(--color-white) 85%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);

  color: var(--color-brown-700);
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

/* Dragging a file over an image card turns the replace scrim blue, matching
   the empty-card drop affordance. */
.card-container--edit[data-dragging] .card-face-uploader__overlay--inset {
  color: var(--color-blue-500);
}

[data-theme='dark'] .card-container--edit[data-dragging] .card-face-uploader__overlay--inset {
  color: var(--color-blue-650);
}
</style>
