<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useAlert } from '@/composables/alert'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const alert = useAlert()
const session = useSessionStore()

function onPress() {
  const { response } = alert.warn({
    title: t('phone.apps.logout.title'),
    message: t('phone.apps.logout.description'),
    confirmLabel: t('phone.apps.logout.confirm'),
    cancelAudio: 'digi_powerdown',
    confirmAudio: 'toggle_off'
  })

  response.then((result) => {
    if (result) session.logout()
  })
}
</script>

<template>
  <app-shell
    :title="t('phone.apps.logout.title')"
    data-theme="red-400"
    data-theme-dark="red-500"
    icon-src="logout"
    hover-icon-src="logout-hover"
    @press="onPress"
  />
</template>
