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
  <div data-testid="account-access-modal__menu" class="h-full flex flex-col justify-center gap-4">
    <p
      data-testid="account-access-modal__description"
      class="text-center text-brown-500 dark:text-brown-300"
    >
      {{ t('account-access-modal.description') }}
    </p>

    <ui-nav-list
      data-theme="brown-50"
      :entries="entries"
      :sfx="{ press: 'snappy_button_5' }"
      @navigate="onNavigate"
    />

    <ui-button
      data-testid="account-access-modal__google-button"
      data-theme="brown-50"
      data-theme-dark="stone-700"
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
