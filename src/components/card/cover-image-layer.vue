<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import FaceOverlay from './face-overlay.vue'
import { type CoverImage } from '@/composables/deck/cover-image'

type CoverImageLayerProps = {
  cover_image: CoverImage
  // The card root element — the layer listens for drag events across the whole
  // cover face, not just its own overlays.
  root: HTMLElement | null
}

const { cover_image, root } = defineProps<CoverImageLayerProps>()

const { t } = useI18n()

onBeforeUnmount(() => detachRootListeners(root))

// The drop target is the whole cover face, so listen on the card root the card
// hands us rather than on this layer's own overlays.
function attachRootListeners(el: HTMLElement | null) {
  if (!el) return
  el.addEventListener('dragenter', cover_image.onDragEnter)
  el.addEventListener('dragleave', cover_image.onDragLeave)
  el.addEventListener('dragover', cover_image.onDragOver)
  el.addEventListener('drop', cover_image.onDrop)
}

function detachRootListeners(el: HTMLElement | null) {
  if (!el) return
  el.removeEventListener('dragenter', cover_image.onDragEnter)
  el.removeEventListener('dragleave', cover_image.onDragLeave)
  el.removeEventListener('dragover', cover_image.onDragOver)
  el.removeEventListener('drop', cover_image.onDrop)
}

watch(
  () => root,
  (el, old) => {
    detachRootListeners(old ?? null)
    attachRootListeners(el)
  },
  { immediate: true }
)
</script>

<template>
  <!-- @click.stop: openPicker()'s synthetic click must not bubble to the preview's cycleSide -->
  <input
    :ref="cover_image.file_input"
    type="file"
    :accept="cover_image.accept"
    class="sr-only"
    @click.stop
    @change="cover_image.onFileChange"
  />

  <ui-button
    v-if="
      !cover_image.has_image.value &&
      !cover_image.dragging.value &&
      !cover_image.error_message.value
    "
    data-testid="cover-image-layer__add"
    icon-only
    icon-left="add-image"
    neutral
    size="xl"
    class="absolute! top-0 right-0 z-20"
    @click.stop="cover_image.openPicker"
  >
    {{ t('deck.settings-modal.cover.add-image') }}
  </ui-button>

  <template
    v-if="
      cover_image.has_image.value && !cover_image.dragging.value && !cover_image.error_message.value
    "
  >
    <ui-button
      data-testid="cover-image-layer__replace"
      icon-only
      icon-left="add-image"
      neutral
      size="xl"
      class="absolute! top-0 left-0 z-20"
      @click.stop="cover_image.openPicker"
    >
      {{ t('deck.settings-modal.cover.replace-image') }}
    </ui-button>

    <ui-button
      data-testid="cover-image-layer__remove"
      icon-only
      icon-left="remove-image"
      data-palette="danger"
      size="xl"
      class="absolute! top-0 right-0 z-20"
      @click.stop="cover_image.onRemove"
    >
      {{ t('deck.settings-modal.cover.remove-image') }}
    </ui-button>
  </template>

  <!-- Dragging a file / a validation error: a full-face prompt over the cover. -->
  <face-overlay
    v-if="cover_image.dragging.value || cover_image.error_message.value"
    variant="full"
    :error="cover_image.error_message.value"
    :heading="t('deck.settings-modal.cover.drop-prompt')"
    @browse="cover_image.openPicker"
    @dismiss-error="cover_image.onDismissError"
  />
</template>
