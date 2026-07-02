<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiNavList, { type NavListEntry } from '@/components/ui-kit/nav-list.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useGoogleActions } from './use-google-actions'

export type AccountAccessPage = 'email' | 'password'

const emit = defineEmits<{ navigate: [page: AccountAccessPage] }>()

const { t } = useI18n()
const { loading, hasGoogleIdentity, hasPasswordIdentity, onConnect, onDisconnect } =
  useGoogleActions()

const entries: NavListEntry[] = [
  {
    value: 'email',
    icon: 'mail-envelope',
    label: t('account-access-modal.menu.update-email-label')
  },
  {
    value: 'password',
    icon: 'keyhole',
    label: t('account-access-modal.menu.change-password-label')
  }
]

function onNavigate(value: string) {
  emit('navigate', value as AccountAccessPage)
}

function onGooglePress() {
  return hasGoogleIdentity.value ? onDisconnect() : onConnect()
}
</script>

<template>
  <div data-testid="account-access-modal__menu" class="flex flex-col gap-4">
    <ui-nav-list data-theme="brown-50" :entries="entries" @navigate="onNavigate" />

    <ui-button
      data-testid="account-access-modal__google-button"
      full-width
      size="lg"
      icon-left="google-logo"
      :loading="loading"
      :disabled="hasGoogleIdentity && !hasPasswordIdentity"
      @press="onGooglePress"
    >
      {{
        hasGoogleIdentity
          ? t('account-access-modal.google.disconnect-account-button')
          : t('account-access-modal.google.connect-account-button')
      }}
    </ui-button>
  </div>
</template>
