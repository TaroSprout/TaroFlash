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
    data-palette="danger"
    icon-left="delete"
    size="lg"
    full-width
    :loading="deleting_account"
    @press="onDeleteAccount"
  >
    {{ t('settings.danger-zone.delete-account-button') }}
  </ui-button>
</template>
