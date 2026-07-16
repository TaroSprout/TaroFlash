<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { deckSettingsCloseKey } from './layout'
import { emitSfx } from '@/sfx/bus'
import { useNoticeStore } from '@/stores/notice-store'

const { t } = useI18n()
const notice = useNoticeStore()
const { is_dirty, has_title, title_error, saveDeck, resetChanges } = inject(deckEditorKey)!
const close = inject(deckSettingsCloseKey)!

const is_saving = ref(false)

async function onSave() {
  if (!has_title.value) {
    title_error.value = t('deck.settings-modal.title-required')
    emitSfx('etc_woodblock_stuck')
    return
  }
  if (!is_dirty.value) {
    emitSfx('digi_powerdown')
    return
  }
  is_saving.value = true
  const saved = await saveDeck()
  is_saving.value = false
  if (saved) {
    close(true)
    return
  }
  notice.error(t('toast.error.deck-save-failed'))
}

function onReset() {
  if (!is_dirty.value) {
    emitSfx('digi_powerdown')
    return
  }
  resetChanges()
}
</script>

<template>
  <div class="flex w-full gap-2">
    <ui-button
      data-testid="deck-settings__reset-button"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      size="lg"
      icon-only
      icon-left="refresh"
      mobile-tooltip
      :sfx="{ press: 'snappy_button_5' }"
      :disabled="!is_dirty"
      click-when-disabled
      class="shrink-0"
      @press="onReset"
    >
      {{ t('deck.settings-modal.reset-changes') }}
    </ui-button>

    <ui-button
      data-testid="deck-settings__save-button"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="lg"
      class="flex-1!"
      :loading="is_saving"
      :disabled="!is_dirty || !has_title"
      click-when-disabled
      @press="onSave"
    >
      {{ t('deck.settings-modal.submit-edit') }}
    </ui-button>
  </div>
</template>
