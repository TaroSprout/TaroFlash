<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useGoogleActions } from './use-google-actions'

const { t } = useI18n()
const { loading, hasGoogleIdentity, hasPasswordIdentity, onConnect, onDisconnect } =
  useGoogleActions()
</script>

<template>
  <div
    data-testid="account-access-modal__google-section"
    class="flex items-center justify-between gap-2"
  >
    <span class="flex items-center gap-2 text-brown-700 dark:text-brown-100">
      <ui-icon src="google-logo" class="size-5" />
      {{
        hasGoogleIdentity
          ? t('account-access-modal.google.connected-label')
          : t('account-access-modal.google.disconnected-label')
      }}
    </span>

    <ui-button
      v-if="!hasGoogleIdentity"
      data-testid="account-access-modal__google-connect"
      data-theme="blue-500"
      size="sm"
      :loading="loading"
      @press="onConnect"
    >
      {{ t('account-access-modal.google.connect-button') }}
    </ui-button>

    <ui-button
      v-else
      data-testid="account-access-modal__google-disconnect"
      data-theme="brown-100"
      size="sm"
      :loading="loading"
      :disabled="!hasPasswordIdentity"
      @press="onDisconnect"
    >
      {{
        hasPasswordIdentity
          ? t('account-access-modal.google.disconnect-button')
          : t('account-access-modal.google.disconnect-disabled-hint')
      }}
    </ui-button>
  </div>
</template>
