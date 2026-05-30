<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { useImageUploadModal } from '@/composables/modals/use-image-upload-modal'

const { image } = defineProps<{
  image?: string
}>()

const emit = defineEmits<{
  (e: 'image-uploaded', file: File): void
  (e: 'image-deleted'): void
}>()

// Card images render small but are the app's highest-volume asset, so cap them
// well below the bucket's 10 MiB backstop.
const CARD_IMAGE_MAX_BYTES = 2 * 1024 * 1024

const { t } = useI18n()
const imageUploadModal = useImageUploadModal()

async function onAddImage() {
  const file = await imageUploadModal.open({ max_bytes: CARD_IMAGE_MAX_BYTES }).response
  if (file) emit('image-uploaded', file)
}

function onImageDelete() {
  emit('image-deleted')
}
</script>

<template>
  <ui-button
    v-if="image"
    icon-only
    icon-left="delete"
    data-theme="red-500"
    @click.stop="onImageDelete"
  >
    {{ t('deck-view.item-options.remove-image') }}
  </ui-button>

  <ui-button v-else icon-only icon-left="add-image" data-theme="blue-500" @click.stop="onAddImage">
    {{ t('deck-view.item-options.upload-image') }}
  </ui-button>
</template>
