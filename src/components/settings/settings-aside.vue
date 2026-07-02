<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GroupedList from '@/components/layout-kit/grouped-list.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useMemberStore } from '@/stores/member'
import SettingsSaveButton from './settings-save-button.vue'

const { t } = useI18n()
const member_store = useMemberStore()
</script>

<template>
  <aside
    data-testid="settings-aside"
    class="h-full flex flex-col justify-end gap-4 text-brown-700 dark:text-brown-100 px-4"
  >
    <grouped-list data-testid="settings-aside__account-info">
      <div data-testid="settings-aside__email-row" class="flex items-center gap-2 px-4 py-3">
        <ui-icon src="mail-envelope" class="size-5" />
        <span>{{ member_store.email }}</span>
      </div>

      <div data-testid="settings-aside__password-row" class="flex items-center gap-2 px-4 py-3">
        <ui-icon src="keyhole" class="size-5" />
        <span>••••••••</span>
      </div>

      <template #overlay>
        <ui-button
          data-testid="settings-aside__edit-account-button"
          class="absolute! -top-2 -right-2 pointer-events-auto"
          data-theme="blue-500"
          icon-left="pencil"
          icon-only
        >
          {{ t('settings.aside.edit-account-button') }}
        </ui-button>
      </template>
    </grouped-list>

    <settings-save-button />
  </aside>
</template>
