<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useSettingsModal } from '@/composables/settings/use-settings-modal'

const { t } = useI18n()
const phone = useTaroPhoneStore()
const settingsModal = useSettingsModal()

function onPress() {
  phone.openApp(settingsModal.open())
}
</script>

<template>
  <app-shell
    :title="t('phone.apps.settings.title')"
    theme="pink-400"
    icon-src="settings"
    hover-icon-src="settings-hover"
    @press="onPress"
  />
</template>
