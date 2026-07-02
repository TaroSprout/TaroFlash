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
    <grouped-list data-testid="settings-aside__account-info" dividers>
      <div
        data-testid="settings-aside__email-row"
        class="justify-between flex items-center gap-3 px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <ui-icon src="mail-envelope" class="size-5" />
          <span>{{ member_store.email }}</span>
        </div>

        <ui-button data-theme="brown-100" variant="ghost" size="sm" icon-left="pencil" icon-only>
          {{ t('settings.aside.edit-email-button') }}
        </ui-button>
      </div>

      <div
        data-testid="settings-aside__password-row"
        class="justify-between flex items-center gap-3 px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <ui-icon src="keyhole" class="size-5" />
          <span>••••••••</span>
        </div>

        <ui-button data-theme="brown-100" variant="ghost" size="sm" icon-left="pencil" icon-only>
          {{ t('settings.aside.edit-password-button') }}
        </ui-button>
      </div>
    </grouped-list>

    <settings-save-button />
  </aside>
</template>
