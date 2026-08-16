<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import FaceOverlay from './face-overlay.vue'
import ImageDropzone from './image-dropzone.vue'
import { CARD_IMAGE_MAX_BYTES, useFaceImageUpload } from '@/composables/card'
import { cardImageUrl } from '@/api/media'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'
import { type SfxOptions } from '@/sfx/directive'
import { playButtonTap } from '@/utils/animations/button-tap'
import { bytesToMbLabel } from '@/utils/file-size'
import { useMatchMedia } from '@/composables/ui/media-query'

type FaceImageLayerProps = {
  card: Card
  side: 'front' | 'back'
  attributes?: CardAttributes
  /** Card root element — drag/hover is listened for across the whole card, and the upload composable dismisses lingering errors on outside clicks. */
  root: HTMLElement | null
  disabled?: boolean
}

const { card, side, attributes, root, disabled = false } = defineProps<FaceImageLayerProps>()

const { t } = useI18n()

const addIcon = useTemplateRef<HTMLElement>('addIcon')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const {
  accept,
  onFileChange,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  dragging,
  file_error,
  hovered,
  active,
  covered,
  pending,
  has_image,
  image_path,
  can_upload,
  onRemove,
  openPicker,
  onDismissError,
  onPointerEnter,
  onPointerLeave
} = useFaceImageUpload({
  card: () => card,
  side: () => side,
  fileInput,
  rootEl: () => root ?? undefined
})

/** True on touch, where hover can't reveal the add button — coarse pointers add/replace images through the card menu instead. */
const is_coarse = useMatchMedia('coarse')

const layout = computed(() => attributes?.image_layout ?? CARD_ATTRIBUTES_DEFAULTS.image_layout)
/** 'corners' floats controls over a full-bleed behind image; 'region' scopes the dropzone to the image's own area for above/below layouts. */
const dropzone_mode = computed(() => (layout.value === 'behind' ? 'corners' : 'region'))
const image_url = computed(() => (image_path.value ? cardImageUrl(image_path.value) : undefined))
/** Also the hover scope switch — in region mode hover comes from the dropzone's enter/leave instead of card-wide. */
const region_dropzone = computed(
  () => has_image.value && !disabled && dropzone_mode.value === 'region'
)
/** Hover chime for behind/full-bleed layouts; region layout scopes its own chime instead (see onRegionPointerEnter). */
const card_sfx = computed<SfxOptions | undefined>(() =>
  has_image.value && dropzone_mode.value === 'corners' ? { hover: 'tap_05' } : undefined
)

const error_message = computed(() => {
  if (file_error.value === 'invalid-type') {
    return t('card.image-editor.invalid-type-error')
  }
  if (file_error.value === 'too-large') {
    return t('card.image-editor.too-large-error', {
      max: bytesToMbLabel(CARD_IMAGE_MAX_BYTES)
    })
  }
  return ''
})

onBeforeUnmount(() => detachRootListeners(root))

/** Skips card-wide hover in region mode — the dropzone reports image-region hover instead. */
function onRootPointerEnter() {
  if (!region_dropzone.value) onPointerEnter()
}

function onRootPointerLeave() {
  if (!region_dropzone.value) onPointerLeave()
}

/** Scopes the hover chime to the image region; behind/full-bleed play it card-wide instead, via `card_sfx`. */
function onRegionPointerEnter() {
  emitSfx('gesture.tick')
  onPointerEnter()
}

function onAddClick() {
  if (addIcon.value) playButtonTap(addIcon.value, 0.35, { yoyo: true })
  openPicker()
}

/** Listens on the card root — the drop target and hover surface is the whole card, not just this layer's own overlays. */
function attachRootListeners(el: HTMLElement | null) {
  if (!el) return
  el.addEventListener('dragenter', onDragEnter)
  el.addEventListener('dragleave', onDragLeave)
  el.addEventListener('dragover', onDragOver)
  el.addEventListener('drop', onDrop)
  el.addEventListener('pointerenter', onRootPointerEnter)
  el.addEventListener('pointerleave', onRootPointerLeave)
}

function detachRootListeners(el: HTMLElement | null) {
  if (!el) return
  el.removeEventListener('dragenter', onDragEnter)
  el.removeEventListener('dragleave', onDragLeave)
  el.removeEventListener('dragover', onDragOver)
  el.removeEventListener('drop', onDrop)
  el.removeEventListener('pointerenter', onRootPointerEnter)
  el.removeEventListener('pointerleave', onRootPointerLeave)
}

watch(
  () => root,
  (el, old) => {
    detachRootListeners(old ?? null)
    attachRootListeners(el)
  },
  { immediate: true }
)

defineExpose({
  active,
  dragging,
  pending,
  covered,
  card_sfx,
  region_dropzone,
  image_url,
  error_message,
  openPicker,
  onRemove,
  onDismissError,
  onRegionPointerEnter,
  onPointerLeave
})
</script>

<template>
  <input ref="fileInput" type="file" :accept="accept" class="sr-only" @change="onFileChange" />

  <div
    v-if="pending"
    data-testid="face-image-layer__loading"
    class="absolute inset-0 z-30 flex items-center justify-center rounded-(--face-radius) bg-(--color-card)/70"
  >
    <ui-icon src="loading-dots" class="size-12 text-ink-muted" />
  </div>

  <ui-tooltip
    v-if="!has_image && can_upload && !disabled && !dragging && !is_coarse"
    element="button"
    type="button"
    :text="t('card.image-editor.upload-image-button')"
    position="top"
    :gap="4"
    data-testid="face-image-layer__add"
    :aria-label="t('card.image-editor.upload-image-button')"
    class="absolute! top-(--face-padding) right-(--face-padding) z-20 cursor-pointer text-ink-muted transition-[color,opacity] duration-150 hover:text-(--color-accent)"
    :class="hovered ? 'opacity-100' : 'opacity-0'"
    v-sfx="{ hover: 'ui.hover' }"
    @click.stop="onAddClick"
  >
    <span ref="addIcon" class="inline-flex">
      <ui-icon src="add-image" class="size-7" />
    </span>
  </ui-tooltip>

  <face-overlay
    v-if="!has_image && (file_error || (can_upload && dragging))"
    variant="full"
    :error="error_message"
    @browse="openPicker"
    @dismiss-error="onDismissError"
  />

  <image-dropzone
    v-if="has_image && !disabled && dropzone_mode === 'corners'"
    mode="corners"
    :active="active"
    :disabled="disabled"
    :error="error_message"
    :remove_label="t('card.image-editor.remove-image-button')"
    :replace_label="t('card.image-editor.replace-image-button')"
    @browse="openPicker"
    @remove="onRemove"
    @dismiss-error="onDismissError"
  />
</template>
