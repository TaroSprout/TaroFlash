<script setup lang="ts">
import { computed, useTemplateRef, type ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import ImageDropzone from './image-dropzone.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { CARD_IMAGE_MAX_BYTES, useFaceImageUpload } from '@/composables/card'
import { cardImageUrl } from '@/api/media'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'
import { type SfxOptions } from '@/sfx/directive'
import { playButtonTap } from '@/utils/animations/button-tap'
import { bytesToMbLabel } from '@/utils/file-size'

type ImageUploaderProps = {
  card: Card
  side: 'front' | 'back'
  card_attributes: DeckCardAttributes
  size?: CardSize
  disabled?: boolean
  error?: boolean
}

const {
  card,
  side,
  card_attributes,
  size = 'xl',
  disabled = false,
  error = false
} = defineProps<ImageUploaderProps>()

const { t } = useI18n()

const addIcon = useTemplateRef<HTMLElement>('addIcon')
const cardRef = useTemplateRef<ComponentPublicInstance>('cardRef')
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
  side,
  fileInput,
  rootEl: () => cardRef.value?.$el as HTMLElement | undefined
})

const layout = computed(
  () => card_attributes[side]?.image_layout ?? CARD_ATTRIBUTES_DEFAULTS.image_layout
)
// Behind keeps the image full-bleed under the text, so its controls float in the
// corners; above/below give the image its own region to scope the dropzone to.
const dropzone_mode = computed(() => (layout.value === 'behind' ? 'corners' : 'region'))
const image_url = computed(() => (image_path.value ? cardImageUrl(image_path.value) : undefined))
// In region mode the image is only part of the card, so hover is scoped to the
// image region (the dropzone emits enter/leave). Empty cards (add button) and
// behind layout (full-bleed image) use card-wide hover instead.
const region_hover = computed(
  () => has_image.value && !disabled && dropzone_mode.value === 'region'
)
// Behind/full-bleed plays the hover chime card-wide; region scopes it to the
// image region (see onRegionPointerEnter), so the card stays silent there.
const card_sfx = computed<SfxOptions | undefined>(() =>
  has_image.value && dropzone_mode.value === 'corners' ? { hover: 'tap_05' } : undefined
)

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

// Skip card-wide hover in region mode — the dropzone reports image-region hover.
function onCardPointerEnter() {
  if (!region_hover.value) onPointerEnter()
}

function onCardPointerLeave() {
  if (!region_hover.value) onPointerLeave()
}

// Region mode scopes the hover chime to the image region; behind/full-bleed play
// it card-wide via the card's own sfx prop.
function onRegionPointerEnter() {
  emitSfx('tap_05')
  onPointerEnter()
}

function onAddClick() {
  if (addIcon.value) playButtonTap(addIcon.value, 0.35, { yoyo: true })
  openPicker()
}
</script>

<template>
  <card
    ref="cardRef"
    mode="edit"
    :size="size"
    :side="side"
    v-bind="card"
    :card_attributes="card_attributes"
    :error="error"
    :sfx="card_sfx"
    :data-active="active || undefined"
    :data-dragging="dragging || undefined"
    :data-loading="pending || undefined"
    :class="{ 'pointer-events-none': disabled }"
    @pointerenter="onCardPointerEnter"
    @pointerleave="onCardPointerLeave"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <input ref="fileInput" type="file" :accept="accept" class="sr-only" @change="onFileChange" />

    <div
      v-if="pending"
      data-testid="image-uploader__loading"
      class="absolute inset-0 z-30 flex items-center justify-center rounded-(--face-radius) bg-white/70 dark:bg-stone-700/70"
    >
      <ui-icon src="loading-dots" class="size-12 text-brown-500 dark:text-brown-100" />
    </div>

    <ui-tooltip
      v-if="!has_image && can_upload && !disabled && !dragging"
      element="button"
      type="button"
      :text="t('deck-view.card-editor.list-item.upload-image-button')"
      position="top"
      :gap="4"
      theme="blue-500"
      theme-dark="blue-650"
      data-testid="image-uploader__add"
      :aria-label="t('deck-view.card-editor.list-item.upload-image-button')"
      class="absolute! top-(--face-padding) right-(--face-padding) z-20 cursor-pointer text-brown-500 transition-[color,opacity] duration-150 hover:text-blue-500 dark:text-brown-100 dark:hover:text-blue-650"
      :class="hovered ? 'opacity-100' : 'opacity-0'"
      v-sfx="{ hover: TYPE_SFX }"
      @click.stop="onAddClick"
    >
      <span ref="addIcon" class="inline-flex">
        <ui-icon src="add-image" class="size-7" />
      </span>
    </ui-tooltip>

    <button
      v-if="!has_image && can_upload && dragging && !file_error"
      type="button"
      data-testid="image-uploader__empty-overlay"
      class="image-uploader__overlay image-uploader__overlay--full"
      @click.stop="openPicker"
    >
      <ui-icon src="add-image" class="size-12" />
    </button>

    <div
      v-if="!has_image && file_error"
      data-testid="image-uploader__error"
      data-error
      class="image-uploader__overlay image-uploader__overlay--full"
      @mousedown.stop
      @click.stop="openPicker"
    >
      <ui-icon src="close" class="size-12" />
      <p class="text-base">{{ error_message }}</p>
      <ui-button
        data-testid="image-uploader__dismiss-error"
        size="sm"
        data-theme="red-500"
        @click.stop="onDismissError"
      >
        {{ t('deck-view.card-editor.list-item.dismiss-error-button') }}
      </ui-button>
    </div>

    <image-dropzone
      v-if="has_image && !disabled && dropzone_mode === 'corners'"
      mode="corners"
      :active="active"
      :disabled="disabled"
      :error="error_message"
      @browse="openPicker"
      @remove="onRemove"
      @dismiss-error="onDismissError"
    />

    <template v-if="has_image && !disabled && dropzone_mode === 'region'" #image>
      <image-dropzone
        mode="region"
        :image="image_url"
        :active="active"
        :disabled="disabled"
        :error="error_message"
        @pointerenter="onRegionPointerEnter"
        @pointerleave="onPointerLeave"
        @browse="openPicker"
        @remove="onRemove"
        @dismiss-error="onDismissError"
      />
    </template>

    <template #editor>
      <div data-testid="image-uploader__editor" :inert="covered || undefined" class="h-full w-full">
        <slot name="editor" />
      </div>
    </template>
  </card>
</template>

<style>
.image-uploader__overlay {
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
    opacity 0.15s ease,
    border-color 0.15s ease;
}

.image-uploader__overlay[data-error] {
  color: var(--color-red-500);
}

.image-uploader__overlay--full {
  inset: 0;
  border: 3px dashed var(--color-blue-500);
  border-radius: var(--face-radius);
  background-color: var(--color-white);

  color: var(--color-blue-500);
}

[data-theme='dark'] .image-uploader__overlay--full {
  background-color: var(--color-stone-700);
}

[data-theme='dark'] .image-uploader__overlay--full:not([data-error]) {
  border-color: var(--color-blue-650);
  color: var(--color-blue-650);
}

.image-uploader__overlay--full[data-error] {
  border-color: var(--color-red-500);
}
</style>
