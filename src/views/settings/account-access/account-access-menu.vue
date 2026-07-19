<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useGoogleActions } from './use-google-actions'

export type AccountAccessPage = 'email' | 'password'

const emit = defineEmits<{ navigate: [page: AccountAccessPage] }>()

const { t } = useI18n()
const { loading, hasGoogleIdentity, hasPasswordIdentity, onConnect, onDisconnect } =
  useGoogleActions()

const entries: OptionsPanelEntry[] = [
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

function onSelect(value: string) {
  emit('navigate', value as AccountAccessPage)
}

function onGooglePress() {
  return hasGoogleIdentity.value ? onDisconnect() : onConnect()
}
</script>

<template>
  <div data-testid="account-access-modal__menu" class="h-full flex flex-col justify-center gap-4">
    <p data-testid="account-access-modal__description" class="text-center text-ink-muted">
      {{ t('account-access-modal.description') }}
    </p>

    <ui-options-panel :entries="entries" :sfx="{ press: 'snappy_button_5' }" @select="onSelect" />

    <ui-button
      neutral
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
