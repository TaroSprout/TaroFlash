<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useFeedbackModal } from '@/composables/feedback/use-feedback-modal'

const { t } = useI18n()
const phone = useTaroPhoneStore()
const feedbackModal = useFeedbackModal()

function onPress() {
  phone.openApp(feedbackModal.open())
}
</script>

<template>
  <app-shell
    :title="t('phone.apps.feedback.title')"
    data-theme="green-400"
    data-theme-dark="green-500"
    icon-src="feedback"
    hover-icon-src="feedback-hover"
    @press="onPress"
  />
</template>
