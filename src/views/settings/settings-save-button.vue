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
const { is_dirty, has_name, name_error, saveMember } = inject(memberEditorKey)!
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
</script>

<template>
  <ui-button
    data-testid="settings__save-button"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    size="lg"
    full-width
    :loading="is_saving"
    :disabled="!is_dirty || !has_name"
    :sfx="{ press: 'snappy_button_2' }"
    click-when-disabled
    @press="onSave"
  >
    {{ t('settings.submit-edit') }}
  </ui-button>
</template>
