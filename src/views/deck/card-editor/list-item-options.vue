<script lang="ts" setup>
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'

type ListItemOptionsProps = {
  upload_disabled?: boolean
}

const { upload_disabled = false } = defineProps<ListItemOptionsProps>()

const emit = defineEmits<{
  (e: 'upload-image'): void
  (e: 'move'): void
  (e: 'delete'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid grid-cols-1 gap-2">
    <ui-button
      @click="emit('upload-image')"
      data-testid="list-item-options__upload-image"
      icon-only
      icon-left="add-image"
      data-theme="brown-100"
      data-theme-dark="grey-900"
      :disabled="upload_disabled"
      :sfx="{ hover: 'ui.pop_drip_mid' }"
    >
      {{ t('deck-view.item-options.upload-image') }}
    </ui-button>

    <ui-button
      @click="emit('move')"
      icon-only
      icon-left="move-item"
      data-theme="brown-100"
      data-theme-dark="grey-900"
      :sfx="{ hover: 'ui.pop_drip_mid' }"
    >
      {{ t('deck-view.item-options.move') }}
    </ui-button>

    <ui-button
      @click="emit('delete')"
      icon-only
      icon-left="delete"
      data-theme="red-500"
      data-theme-dark="red-600"
      :sfx="{ hover: 'ui.pop_drip_mid' }"
    >
      {{ t('deck-view.item-options.delete') }}
    </ui-button>
  </div>
</template>
