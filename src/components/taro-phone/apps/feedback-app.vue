<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'

const { t } = useI18n()
</script>

<template>
  <app-shell
    :title="t('phone.apps.feedback.title')"
    data-theme="green-400"
    icon-src="feedback"
    hover-icon-src="feedback-hover"
  />
</template>
