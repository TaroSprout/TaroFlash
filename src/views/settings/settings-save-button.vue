<script setup lang="ts">
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { settingsCloseKey } from './layout'
import { emitSfx } from '@/sfx/bus'
import { useNoticeStore } from '@/stores/notice-store'

const { t } = useI18n()
const notice = useNoticeStore()
const { is_dirty, has_name, name_error, saveMember, resetChanges } = inject(memberEditorKey)!
const close = inject(settingsCloseKey)!

const is_saving = ref(false)

async function onSave() {
  if (!has_name.value) {
    name_error.value = t('settings.profile.member-name-required')
    emitSfx('etc_woodblock_stuck')
    return
  }
  is_saving.value = true
  const saved = await saveMember()
  is_saving.value = false
  if (saved) {
    close()
    return
  }
  notice.error(t('settings.save-error'))
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
      data-testid="settings__reset-button"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      size="lg"
      icon-only
      icon-left="refresh"
      :sfx="{ press: 'snappy_button_5' }"
      :disabled="!is_dirty"
      click-when-disabled
      class="shrink-0"
      @press="onReset"
    >
      {{ t('settings.reset-changes') }}
    </ui-button>

    <ui-button
      data-testid="settings__save-button"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      size="lg"
      class="flex-1!"
      :loading="is_saving"
      :disabled="!is_dirty || !has_name"
      :sfx="{ press: 'snappy_button_2' }"
      click-when-disabled
      @press="onSave"
    >
      {{ t('settings.submit-edit') }}
    </ui-button>
  </div>
</template>
