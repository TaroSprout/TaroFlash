<script lang="ts" setup>
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { TYPE_SFX } from '@/sfx/config'

const emit = defineEmits<{
  (e: 'move'): void
  (e: 'delete'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid grid-cols-1 gap-2">
    <ui-button
      neutral
      @press="emit('move')"
      icon-only
      icon-left="move-item"
      :sfx="{ hover: TYPE_SFX }"
    >
      {{ t('deck-view.item-options.move') }}
    </ui-button>

    <ui-button
      @press="emit('delete')"
      icon-only
      icon-left="delete"
      data-palette="danger"
      :sfx="{ hover: TYPE_SFX }"
    >
      {{ t('deck-view.item-options.delete') }}
    </ui-button>
  </div>
</template>
