<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { deckEditorKey } from '@/composables/deck-editor'
import { deckSettingsCloseKey } from './layout'
import { emitSfx } from '@/sfx/bus'

const { t } = useI18n()
const { settings, is_dirty, saveDeck } = inject(deckEditorKey)!
const close = inject(deckSettingsCloseKey)!

const is_saving = ref(false)

async function onSave() {
  if (!is_dirty.value) {
    emitSfx('ui.digi_powerdown')
    return
  }
  if (!settings.title?.trim()) {
    emitSfx('ui.etc_woodblock_stuck')
    return
  }
  is_saving.value = true
  const saved = await saveDeck()
  is_saving.value = false
  if (saved) close(true)
}
</script>

<template>
  <ui-button
    data-testid="deck-settings__save-button"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    size="lg"
    full-width
    :loading="is_saving"
    :disabled="!is_dirty"
    :sfx="{ click: 'ui.snappy_button_2' }"
    click-when-disabled
    @click="onSave"
  >
    {{ t('deck.settings-modal.submit-edit') }}
  </ui-button>
</template>
