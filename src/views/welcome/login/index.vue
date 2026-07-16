<script setup lang="ts">
import LoginDialog from './dialog.vue'
import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <ui-dropdown-button
    size="lg"
    data-theme="brown-700"
    data-theme-dark="brown-100"
    menu-theme="brown-200"
    menu-theme-dark="stone-700"
    variant="ghost"
    shadow
    position="bottom-end"
    icon-left="user-sticker-square"
    open-on-trigger
    hide-trigger
    data-testid="login__trigger"
  >
    {{ t('welcome-view.login-button') }}

    <template #panel>
      <login-dialog />
    </template>
  </ui-dropdown-button>
</template>
