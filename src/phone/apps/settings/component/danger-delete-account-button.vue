<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { memberDangerActionsKey } from '@/composables/member/danger-actions'

const { t } = useI18n()
const { onDeleteAccount, deleting_account } = inject(memberDangerActionsKey)!
</script>

<template>
  <ui-button
    data-testid="danger-delete-account-button"
    data-theme="red-500"
    data-theme-dark="red-600"
    icon-left="delete"
    size="lg"
    full-width
    :loading="deleting_account"
    @click="onDeleteAccount"
  >
    {{ t('settings.danger-zone.delete-account-button') }}
  </ui-button>
</template>
