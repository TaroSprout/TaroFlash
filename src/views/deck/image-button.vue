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

const { t } = useI18n()
const imageUploadModal = useImageUploadModal()

async function onAddImage() {
  const file = await imageUploadModal.open().response
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

  <ui-button
    v-else
    icon-only
    icon-left="add-image"
    data-theme="yellow-500"
    @click.stop="onAddImage"
  >
    {{ t('deck-view.item-options.upload-image') }}
  </ui-button>
</template>
