<script setup lang="ts">
import LoginDialog from './dialog.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'
import { useLoginModal } from './login-modal'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { open: openLoginModal } = useLoginModal()

const is_mobile = useMatchMedia('w<md')
</script>

<template>
  <ui-button
    v-if="is_mobile"
    size="lg"
    data-theme="brown-200"
    data-theme-dark="stone-700"
    variant="ghost"
    icon-left="user-sticker-square"
    data-testid="login__trigger"
    @press="openLoginModal"
  >
    {{ t('welcome-view.login-button') }}
  </ui-button>

  <ui-dropdown-button
    v-else
    size="lg"
    data-theme="brown-200"
    data-theme-dark="stone-700"
    menu-theme="brown-200"
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
