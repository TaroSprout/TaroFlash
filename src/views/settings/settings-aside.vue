<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiOptionsPanel, { type OptionsPanelEntry } from '@/components/ui-kit/options-panel/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMemberStore } from '@/stores/member'
import { useAccountAccessClick } from './use-account-access-click'
import SettingsSaveButton from './settings-save-button.vue'

const { t } = useI18n()
const member_store = useMemberStore()
const { onAccountAccessClick } = useAccountAccessClick()

const entries = computed<OptionsPanelEntry[]>(() => [
  { value: 'email', label: member_store.email ?? '', icon: 'mail-envelope' },
  { value: 'password', label: '••••••••', icon: 'keyhole' }
])
</script>

<template>
  <aside data-testid="settings-aside" class="h-full flex flex-col justify-end gap-4 text-ink px-4">
    <ui-options-panel
      data-testid="settings-aside__account-info"
      :entries="entries"
      :interactive="false"
    >
      <template #overlay>
        <ui-button
          data-testid="settings-aside__edit-account-button"
          class="absolute! -top-2 -right-2 pointer-events-auto"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          icon-left="pencil"
          icon-only
          @press="onAccountAccessClick"
        >
          {{ t('settings.aside.edit-account-button') }}
        </ui-button>
      </template>
    </ui-options-panel>

    <settings-save-button />
  </aside>
</template>
