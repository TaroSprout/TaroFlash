<script setup lang="ts">
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import LoginDialog from './dialog.vue'
import { useI18n } from 'vue-i18n'

const { close } = defineProps<{
  close: (response?: boolean) => void
}>()

const { t } = useI18n()
</script>

<template>
  <app-window
    data-testid="login-sheet"
    data-palette="blue"
    :title="t('login-dialog.heading')"
    @close="close()"
    class="md:max-w-100"
  >
    <div data-testid="login-sheet__body" class="flex flex-col items-center p-4">
      <login-dialog :close="close" />
    </div>
  </app-window>
</template>
